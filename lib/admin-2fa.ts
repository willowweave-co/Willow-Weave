import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

/**
 * Crypto for the dashboard's email 2FA (see supabase/migrations/0013).
 *
 * Everything here is server-only and keyed by a secret that never reaches the
 * database, so `admin_login_challenges` rows are inert on their own: the code
 * is stored as an HMAC (not reversible) and the pending Supabase session as
 * AES-256-GCM ciphertext (not readable without the key).
 */

export const CODE_LENGTH = 6;
export const CHALLENGE_TTL_MS = 10 * 60_000; // code is good for 10 minutes
export const MAX_ATTEMPTS = 5; // wrong guesses before the challenge dies
export const MAX_RESENDS = 3; // "send it again" presses per challenge
export const RESEND_COOLDOWN_MS = 45_000;

/**
 * Key material. ADMIN_2FA_SECRET when set; otherwise derived from the
 * service-role key, which this feature already requires and which is equally
 * server-only — so 2FA works on an existing deployment with no new env var.
 * Rotating either secret invalidates in-flight challenges only (a user simply
 * signs in again); it never touches stored data.
 */
function key(): Buffer {
  const secret = process.env.ADMIN_2FA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("ADMIN_2FA_SECRET or SUPABASE_SERVICE_ROLE_KEY is not configured");
  // Both inputs are high-entropy secrets already; SHA-256 just widens/narrows
  // them to the 32 bytes AES-256 and HMAC-SHA256 want.
  return createHash("sha256").update(`ww-admin-2fa:${secret}`).digest();
}

/** A fresh 6-digit code. randomInt is CSPRNG-backed and free of modulo bias. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * Keyed digest of a code. Bound to the account's email so a hash lifted from
 * one row cannot be replayed against another.
 */
export function hashCode(code: string, email: string): string {
  return createHmac("sha256", key())
    .update(`${normalizeEmail(email)}|${code}`)
    .digest("hex");
}

/** Constant-time comparison — a plain === leaks the matching prefix length. */
export function codeMatches(code: string, email: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashCode(code, email), "utf8");
  const stored = Buffer.from(storedHash, "utf8");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export interface PendingSession {
  access_token: string;
  refresh_token: string;
}

/** AES-256-GCM. Output is `iv.tag.ciphertext`, all base64url. */
export function encryptSession(session: PendingSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

/** Returns null on any tampering, truncation or key mismatch — never throws. */
export function decryptSession(blob: string): PendingSession | null {
  try {
    const [ivB64, tagB64, ctB64] = blob.split(".");
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plain) as PendingSession;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * "owner@willowweave.co" → "ow•••@willowweave.co". Shown on the code screen to
 * confirm where the mail went without printing the full address on a page that
 * anyone holding a stolen password can reach.
 */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = normalizeEmail(email).split("@");
  if (!domain) return "your email";
  const head = local.slice(0, local.length > 3 ? 2 : 1);
  return `${head}${"•".repeat(3)}@${domain}`;
}
