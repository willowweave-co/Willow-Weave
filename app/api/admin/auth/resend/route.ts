import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataMode } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { sendAdminLoginCode } from "@/lib/email";
import {
  CHALLENGE_TTL_MS,
  MAX_RESENDS,
  RESEND_COOLDOWN_MS,
  generateCode,
  hashCode,
} from "@/lib/admin-2fa";
import { CHALLENGES, STALE_CHALLENGE_ERROR, jsonError, type ChallengeRow } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Send it again" on the code screen. Re-keys the existing challenge rather
 * than starting a new one, so the password is never re-sent from the browser
 * and the stored session stays put.
 *
 * Note what is NOT reset: `attempts`. Resending must not hand a guesser a
 * fresh budget of tries.
 */

const schema = z.object({ challengeId: z.string().uuid() });

export async function POST(request: NextRequest) {
  if (dataMode === "local") {
    return jsonError("Sign-in is unavailable: this deployment has no database configured.", 503);
  }

  const ip = clientIpFrom(request);
  const limit = rateLimit(`2fa-resend:${ip}`, 6, 10 * 60_000);
  if (!limit.ok) {
    return jsonError("Too many requests. Try again in a few minutes.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(STALE_CHALLENGE_ERROR, 400);

  const admin = createSupabaseAdmin();
  const { data: challenge } = await admin
    .from(CHALLENGES)
    .select("*")
    .eq("id", parsed.data.challengeId)
    .maybeSingle<ChallengeRow>();

  if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) {
    return jsonError(STALE_CHALLENGE_ERROR, 410);
  }

  if (challenge.resends >= MAX_RESENDS) {
    return jsonError(
      "You’ve requested a new code too many times. Please sign in again.",
      429
    );
  }

  // Server-side cooldown — the greyed-out button is UX, this is the control.
  const since = Date.now() - new Date(challenge.last_sent_at).getTime();
  if (since < RESEND_COOLDOWN_MS) {
    return jsonError("Please wait a moment before requesting another code.", 429, {
      retryAfter: Math.ceil((RESEND_COOLDOWN_MS - since) / 1000),
    });
  }

  // A fresh code invalidates the previous one (the hash is overwritten), and
  // the clock restarts so a late resend isn't born nearly expired.
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const { error } = await admin
    .from(CHALLENGES)
    .update({
      code_hash: hashCode(code, challenge.email),
      resends: challenge.resends + 1,
      last_sent_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", challenge.id);
  if (error) {
    console.error("2FA resend could not update the challenge:", error.message);
    return jsonError("We couldn’t send another code. Please sign in again.", 500);
  }

  const delivery = await sendAdminLoginCode(challenge.email, code, { ip });
  if (delivery === "failed") {
    return jsonError("We couldn’t send another code. Please try again in a moment.", 502);
  }

  return NextResponse.json({
    expiresAt: expiresAt.toISOString(),
    resendsLeft: MAX_RESENDS - (challenge.resends + 1),
    consoleOnly: delivery === "console",
  });
}
