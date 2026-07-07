"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { THEME_IMAGES } from "@/lib/content-constants";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const timedOut = searchParams.get("timeout") === "1";

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      router.push("/admin");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(
        err.message.includes("Invalid login credentials")
          ? "Wrong email or password."
          : err.message
      );
      return;
    }
    router.push((searchParams.get("next") as never) ?? "/admin");
    router.refresh();
  };

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
          <h1 className="heading-display mt-3 text-2xl font-semibold text-ink">Staff sign in</h1>
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
        ) : (
          <form onSubmit={signIn} className="rounded-2xl border border-line bg-white/60 p-6">
            {timedOut && !error && (
              <p className="mb-4 rounded-lg border border-gold/50 bg-gold/15 px-3 py-2 text-sm text-walnut-dark">
                You were signed out after 30 minutes of inactivity. Sign in again to continue.
              </p>
            )}
            {error && (
              <p className="mb-4 rounded-lg border border-madder/30 bg-madder/8 px-3 py-2 text-sm text-madder">
                {error}
              </p>
            )}
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-umber">
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
