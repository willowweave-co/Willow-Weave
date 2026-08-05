import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataMode } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { CODE_LENGTH, MAX_ATTEMPTS, codeMatches, decryptSession } from "@/lib/admin-2fa";
import { CHALLENGES, STALE_CHALLENGE_ERROR, jsonError, type ChallengeRow } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2: check the emailed code and, only then, sign the browser in.
 *
 * The session written here is the one minted during step 1 — decrypted from
 * the challenge row and handed to the cookie-bound server client, which writes
 * the Supabase auth cookies onto this response. Nothing before this point ever
 * put a session in front of the browser.
 */

const schema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`)),
});

export async function POST(request: NextRequest) {
  if (dataMode === "local") {
    return jsonError("Sign-in is unavailable: this deployment has no database configured.", 503);
  }

  const ip = clientIpFrom(request);
  // The per-challenge attempts counter is the real bound; this only stops one
  // source burning through fresh challenges in a loop.
  const limit = rateLimit(`2fa-verify:${ip}`, 30, 10 * 60_000);
  if (!limit.ok) {
    return jsonError("Too many attempts. Try again in a few minutes.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Enter the ${CODE_LENGTH}-digit code from your email.`, 400);

  const { challengeId, code } = parsed.data;
  const admin = createSupabaseAdmin();

  const { data: challenge } = await admin
    .from(CHALLENGES)
    .select("*")
    .eq("id", challengeId)
    .maybeSingle<ChallengeRow>();

  if (!challenge) return jsonError(STALE_CHALLENGE_ERROR, 410);

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await admin.from(CHALLENGES).delete().eq("id", challengeId);
    return jsonError("That code has expired. Please sign in again.", 410);
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await admin.from(CHALLENGES).delete().eq("id", challengeId);
    return jsonError("Too many incorrect codes. Please sign in again.", 410);
  }

  if (!codeMatches(code, challenge.email, challenge.code_hash)) {
    const attempts = challenge.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await admin.from(CHALLENGES).delete().eq("id", challengeId);
      return jsonError("Too many incorrect codes. Please sign in again.", 410);
    }
    await admin.from(CHALLENGES).update({ attempts }).eq("id", challengeId);
    return jsonError("That code isn’t right.", 401, { attemptsLeft: MAX_ATTEMPTS - attempts });
  }

  // Correct. Delete-then-use, and require the delete to have claimed the row:
  // Postgres serialises the two writers, so of two racing requests with the
  // same code exactly one gets a row back and exactly one session is issued.
  const { data: claimed } = await admin
    .from(CHALLENGES)
    .delete()
    .eq("id", challengeId)
    .select("session_cipher")
    .maybeSingle<Pick<ChallengeRow, "session_cipher">>();
  if (!claimed) return jsonError(STALE_CHALLENGE_ERROR, 410);

  const session = decryptSession(claimed.session_cipher);
  if (!session) {
    // Key rotated (or the row was tampered with) — the stored session can't be
    // recovered, so the user simply signs in again under the current key.
    console.error("2FA: stored session could not be decrypted for challenge", challengeId);
    return jsonError(STALE_CHALLENGE_ERROR, 410);
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.setSession(session);
  if (error) {
    console.error("2FA: setSession failed:", error.message);
    return jsonError("Sign-in could not be completed. Please try again.", 500);
  }

  return NextResponse.json({ ok: true });
}
