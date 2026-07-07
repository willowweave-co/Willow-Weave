"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const IDLE_MS = 30 * 60_000; // auto sign-out after 30 min without activity (OWASP-range default)
const WARN_MS = 60_000; // show the "still there?" dialog for the final minute
const STORAGE_KEY = "ww-admin-last-active"; // shared so activity in any tab counts

/**
 * Inactivity timeout for the dashboard (Supabase mode only — the layout skips
 * it in local preview). Any interaction refreshes a shared last-active
 * timestamp; a 1s watchdog warns during the final minute and then signs out,
 * landing on /admin/login?timeout=1 which explains what happened.
 */
export function IdleLogout() {
  const router = useRouter();
  // null = no warning; otherwise seconds remaining in the countdown dialog
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const signingOutRef = useRef(false);
  const warning = secondsLeft !== null;

  const markActive = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* storage unavailable — watchdog falls back to mount time */
    }
  }, []);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    try {
      await createSupabaseBrowser().auth.signOut();
    } catch {
      /* even offline, leave the dashboard — proxy re-checks on return */
    }
    router.replace("/admin/login?timeout=1" as never);
    router.refresh();
  }, [router]);

  // Activity listeners — paused while the warning dialog is up so only an
  // explicit "Stay signed in" (not a stray mouse bump) extends the session.
  useEffect(() => {
    if (warning) return;
    markActive(); // also clears a stale timestamp from a previous session
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5_000) return; // throttle storage writes
      lastWrite = now;
      markActive();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true, capture: true })
    );
    return () =>
      events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
  }, [warning, markActive]);

  // 1s watchdog: reads the shared timestamp (so another tab's activity counts)
  // and drives warning → sign-out. Also catches long background/sleep gaps.
  useEffect(() => {
    const started = Date.now();
    const tick = () => {
      let lastActive = started;
      try {
        const raw = Number(localStorage.getItem(STORAGE_KEY));
        if (raw > 0) lastActive = raw;
      } catch {}
      const left = lastActive + IDLE_MS - Date.now();
      if (left <= 0) {
        void signOut();
      } else {
        setSecondsLeft(left <= WARN_MS ? Math.ceil(left / 1000) : null);
      }
    };
    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, [signOut]);

  if (!warning) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/45 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ivory p-6 text-center shadow-2xl">
        <TimerOff className="mx-auto h-8 w-8 text-walnut" />
        <h2 id="idle-title" className="heading-display mt-3 text-lg font-semibold text-ink">
          Still there?
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-bark">
          You&apos;ve been inactive for a while. For security you&apos;ll be signed out in{" "}
          <strong className="tabular-nums text-ink">{secondsLeft}s</strong>.
        </p>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            markActive();
            setSecondsLeft(null);
          }}
        >
          Stay signed in
        </Button>
        <button
          onClick={() => void signOut()}
          className="mt-3 text-xs text-umber transition-colors hover:text-madder"
        >
          Sign out now
        </button>
      </div>
    </div>
  );
}
