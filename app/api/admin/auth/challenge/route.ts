import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataMode } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { sendAdminLoginCode } from "@/lib/email";
import {
  CHALLENGE_TTL_MS,
  encryptSession,
  generateCode,
  hashCode,
  maskEmail,
  normalizeEmail,
} from "@/lib/admin-2fa";
import {
  CHALLENGES,
  GENERIC_CREDENTIALS_ERROR,
  createSupabaseEphemeral,
  jsonError,
} from "../_lib";

export const runtime = "nodejs"; // node:crypto in lib/admin-2fa
export const dynamic = "force-dynamic";

/**
 * Step 1 of the dashboard sign-in: verify email + password, then email a code.
 *
 * The password check happens HERE rather than in the browser, and that is the
 * whole point of the feature. The old form called signInWithPassword() client
 * side, which set the session cookie the moment the password was right — any
 * code prompt after that would have been theatre, because the attacker would
 * already have been signed in. So this route holds the resulting session back:
 * it is encrypted and parked in admin_login_challenges, and only /verify (on a
 * correct code) turns it into cookies.
 */

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  // Local preview has no accounts to authenticate — the login page short-circuits
  // to the dashboard there and never calls this.
  if (dataMode === "local") {
    return jsonError("Sign-in is unavailable: this deployment has no database configured.", 503);
  }

  const ip = clientIpFrom(request);
  // Password attempts, not page loads: a tight budget per source.
  const byIp = rateLimit(`2fa-challenge:${ip}`, 10, 10 * 60_000);
  if (!byIp.ok) {
    return jsonError("Too many sign-in attempts. Try again in a few minutes.", 429, {
      retryAfter: byIp.retryAfter,
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your email and password.", 400);

  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  // Second bucket keyed on the account, so spreading attempts across proxies
  // still can't hammer one inbox — and can't spam it with codes either.
  const byEmail = rateLimit(`2fa-challenge-email:${email}`, 6, 10 * 60_000);
  if (!byEmail.ok) {
    return jsonError("Too many sign-in attempts for this account. Try again shortly.", 429, {
      retryAfter: byEmail.retryAfter,
    });
  }

  // ── Factor 1: the password ────────────────────────────────────────────────
  const ephemeral = createSupabaseEphemeral();
  const { data: auth, error: signInError } = await ephemeral.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !auth.session || !auth.user) {
    return jsonError(GENERIC_CREDENTIALS_ERROR, 401);
  }

  const admin = createSupabaseAdmin();

  // A Supabase auth user is not automatically staff — only a profiles row is
  // (same rule as lib/admin-auth.ts and the is_staff() RLS helper).
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile) {
    // We minted a session for a non-staff account; revoke it rather than leave
    // a live refresh token behind, and answer as if the password were wrong.
    await ephemeral.auth.signOut().catch(() => {});
    return jsonError(GENERIC_CREDENTIALS_ERROR, 401);
  }

  // Where the code actually goes: the profile's address of record, never the
  // string typed into the form. They are the same for a genuine sign-in, but
  // this way a mistyped-but-valid variant can't redirect a code anywhere.
  const deliverTo = profile.email || auth.user.email || email;

  // ── Factor 2: issue the code ──────────────────────────────────────────────
  // One live challenge per account: a new attempt supersedes any earlier one.
  await admin.from(CHALLENGES).delete().eq("user_id", auth.user.id);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  let challengeId: string;
  try {
    const { data: row, error } = await admin
      .from(CHALLENGES)
      .insert({
        user_id: auth.user.id,
        email: deliverTo,
        code_hash: hashCode(code, deliverTo),
        session_cipher: encryptSession({
          access_token: auth.session.access_token,
          refresh_token: auth.session.refresh_token,
        }),
        ip,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();
    if (error || !row) throw error ?? new Error("no row returned");
    challengeId = row.id as string;
  } catch (e) {
    // Most likely migration 0013 hasn't been applied yet. Fail closed and say
    // so — never fall through to signing the user in without the second factor.
    console.error("2FA challenge could not be stored:", e);
    return jsonError(
      "Two-step sign-in isn’t ready on this deployment. Apply migration 0013 and try again.",
      503
    );
  }

  const delivery = await sendAdminLoginCode(deliverTo, code, { ip });
  if (delivery === "failed") {
    // No code reached the inbox, so no one can complete this challenge. Bin it
    // rather than leave a dead row holding an encrypted session.
    await admin.from(CHALLENGES).delete().eq("id", challengeId);
    return jsonError(
      "We couldn’t send your verification code. Please try again in a moment.",
      502
    );
  }

  return NextResponse.json({
    challengeId,
    maskedEmail: maskEmail(deliverTo),
    expiresAt: expiresAt.toISOString(),
    // Dev convenience only: tells the login screen to point at the server log.
    consoleOnly: delivery === "console",
  });
}
