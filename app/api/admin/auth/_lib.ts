import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Shared bits for the two-step admin sign-in routes (challenge → verify). */

export const CHALLENGES = "admin_login_challenges";

export interface ChallengeRow {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  session_cipher: string;
  attempts: number;
  resends: number;
  last_sent_at: string;
  expires_at: string;
}

/**
 * Throwaway Supabase client used only to check a password. persistSession is
 * off and nothing here writes cookies: verifying credentials must NOT be the
 * thing that signs the browser in — that only happens once the emailed code is
 * confirmed, in the verify route.
 */
export function createSupabaseEphemeral() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase is not configured");
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * One message for "wrong password", "no such account" and "signed up but not
 * staff". Distinguishing them would turn the login form into an account
 * enumerator for whoever is holding a leaked password list.
 */
export const GENERIC_CREDENTIALS_ERROR = "Wrong email or password.";

/** The challenge is gone (expired, spent, or never existed) — start over. */
export const STALE_CHALLENGE_ERROR =
  "That sign-in request has expired. Please enter your email and password again.";
