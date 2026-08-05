"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, MailCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { THEME_IMAGES } from "@/lib/content-constants";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 45; // mirrors RESEND_COOLDOWN_MS; the server enforces it

interface Challenge {
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
  consoleOnly?: boolean;
}

/** mm:ss left until `iso`, or null once it's in the past. */
function useCountdown(iso: string | null): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return;
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

function formatLeft(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Non-null once the password has been accepted and a code is in the post.
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const submittedCodeRef = useRef<string | null>(null);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const timedOut = searchParams.get("timeout") === "1";
  const secondsLeft = useCountdown(challenge?.expiresAt ?? null);
  const expired = challenge !== null && secondsLeft === 0;

  const nextPath = searchParams.get("next") ?? "/admin";

  // Focus the code box when it appears, and run the resend cooldown.
  useEffect(() => {
    if (challenge) codeRef.current?.focus();
  }, [challenge]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, [cooldown]);

  // ── Step 1: email + password ──────────────────────────────────────────────
  const startSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      router.push("/admin");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    const { ok, data } = await post("/api/admin/auth/challenge", { email, password });
    setLoading(false);
    if (!ok) {
      setError((data.error as string) ?? "Something went wrong. Please try again.");
      return;
    }
    // The password is done with — drop it rather than leave it in component
    // state for the rest of the code step.
    setPassword("");
    setCode("");
    setCooldown(RESEND_COOLDOWN_S);
    setChallenge(data as unknown as Challenge);
  };

  // ── Step 2: the emailed code ──────────────────────────────────────────────
  const submitCode = useCallback(
    async (value: string) => {
      if (!challenge || value.length !== CODE_LENGTH) return;
      // Guard the auto-submit: without this, a re-render after a wrong code
      // would fire the same value again and burn a second attempt.
      if (submittedCodeRef.current === value) return;
      submittedCodeRef.current = value;

      setLoading(true);
      setError(null);
      const { ok, status, data } = await post("/api/admin/auth/verify", {
        challengeId: challenge.challengeId,
        code: value,
      });

      if (!ok) {
        setLoading(false);
        setCode("");
        codeRef.current?.focus();
        const message = (data.error as string) ?? "That code isn’t right.";
        const left = typeof data.attemptsLeft === "number" ? data.attemptsLeft : null;
        setError(left !== null ? `${message} ${left} ${left === 1 ? "try" : "tries"} left.` : message);
        // 410 = the challenge is spent or expired; send them back to step 1.
        if (status === 410) {
          setChallenge(null);
          setNotice(null);
        }
        return;
      }

      // Session cookies are set on the response — reload so the server
      // components (and the proxy guard) pick the session up.
      router.replace(nextPath as never);
      router.refresh();
    },
    [challenge, nextPath, router]
  );

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length < CODE_LENGTH) submittedCodeRef.current = null;
    if (digits.length === CODE_LENGTH) void submitCode(digits);
  };

  const resend = async () => {
    if (!challenge || cooldown > 0) return;
    setLoading(true);
    setError(null);
    const { ok, data } = await post("/api/admin/auth/resend", {
      challengeId: challenge.challengeId,
    });
    setLoading(false);
    if (!ok) {
      setError((data.error as string) ?? "We couldn’t send another code.");
      if (typeof data.retryAfter === "number") setCooldown(data.retryAfter);
      return;
    }
    setCode("");
    submittedCodeRef.current = null;
    setCooldown(RESEND_COOLDOWN_S);
    setChallenge({ ...challenge, expiresAt: data.expiresAt as string });
    setNotice("A new code is on its way.");
    codeRef.current?.focus();
  };

  const backToPassword = () => {
    setChallenge(null);
    setCode("");
    submittedCodeRef.current = null;
    setError(null);
    setNotice(null);
  };

  const banner = (kind: "error" | "notice" | "warn", text: string) => (
    <p
      className={
        kind === "error"
          ? "mb-4 rounded-lg border border-madder/30 bg-madder/8 px-3 py-2 text-sm text-madder"
          : kind === "warn"
            ? "mb-4 rounded-lg border border-gold/50 bg-gold/15 px-3 py-2 text-sm text-walnut-dark"
            : "mb-4 rounded-lg border border-walnut/25 bg-walnut/8 px-3 py-2 text-sm text-walnut-dark"
      }
      role={kind === "error" ? "alert" : "status"}
    >
      {text}
    </p>
  );

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Image
            src={THEME_IMAGES.logo}
            alt="Willow Weave"
            width={72}
            height={72}
            className="mx-auto h-18 w-18 object-contain"
          />
          <h1 className="heading-display mt-3 text-2xl font-semibold text-ink">
            {challenge ? "Check your email" : "Staff sign in"}
          </h1>
          <p className="mt-1 text-sm text-umber">Willow Weave dashboard</p>
        </div>

        {!supabaseConfigured ? (
          <div className="rounded-2xl border border-line bg-white/60 p-6 text-center">
            <p className="text-sm leading-relaxed text-bark">
              Running in <strong>local preview mode</strong> — no sign-in needed.
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push("/admin")}>
              Enter dashboard
            </Button>
          </div>
        ) : challenge ? (
          /* ── Step 2 — verification code ── */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCode(code);
            }}
            className="rounded-2xl border border-line bg-white/60 p-6"
          >
            <div className="mb-4 flex items-start gap-2.5 text-sm leading-relaxed text-bark">
              <MailCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-walnut" aria-hidden />
              <p>
                We sent a {CODE_LENGTH}-digit code to{" "}
                <strong className="text-ink">{challenge.maskedEmail}</strong>. Enter it below to
                finish signing in.
              </p>
            </div>

            {error && banner("error", error)}
            {!error && notice && banner("notice", notice)}
            {!error && challenge.consoleOnly &&
              banner("warn", "Local dev: no RESEND_API_KEY — the code was printed to the server log.")}

            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              ref={codeRef}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d*"
              maxLength={CODE_LENGTH}
              placeholder="000000"
              aria-describedby="code-help"
              disabled={expired}
              className="text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em] placeholder:text-umber/30"
            />

            <p id="code-help" className="mt-2 text-center text-xs text-umber">
              {expired ? (
                <span className="text-madder">This code has expired.</span>
              ) : secondsLeft !== null ? (
                <>
                  Expires in <span className="tabular-nums">{formatLeft(secondsLeft)}</span>
                </>
              ) : (
                " "
              )}
            </p>

            <Button
              type="submit"
              loading={loading}
              disabled={code.length !== CODE_LENGTH || expired}
              className="mt-4 w-full"
            >
              Verify &amp; sign in
            </Button>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={backToPassword}
                className="inline-flex items-center gap-1 text-umber transition-colors hover:text-walnut"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Use a different account
              </button>
              <button
                type="button"
                onClick={() => void resend()}
                disabled={cooldown > 0 || loading}
                className="text-walnut transition-colors hover:underline disabled:text-umber disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
              </button>
            </div>
          </form>
        ) : (
          /* ── Step 1 — email + password ── */
          <form onSubmit={startSignIn} className="rounded-2xl border border-line bg-white/60 p-6">
            {timedOut && !error && (
              banner("warn", "You were signed out after 30 minutes of inactivity. Sign in again to continue.")
            )}
            {error && banner("error", error)}
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 p-0.5 text-umber transition-colors hover:text-walnut"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" loading={loading} className="w-full">
                Continue
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-umber">
              We’ll email you a {CODE_LENGTH}-digit code to confirm it’s you.
              <br />
              Accounts are invite-only — ask the store owner for access.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
