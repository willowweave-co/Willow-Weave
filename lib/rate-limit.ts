import { headers } from "next/headers";

/**
 * Fixed-window rate limiter, in-process.
 *
 * Scope and honesty about it: state lives in the memory of one serverless
 * instance, so a determined attacker spread across many warm instances gets a
 * multiple of these budgets. It exists to make the cheap attacks — discount
 * code brute-forcing, order spam, beacon flooding from a single source —
 * uneconomical, not to be a hard perimeter. The hard perimeter is Vercel's
 * WAF/firewall rate limiting, configured in the dashboard (see SETUP.md);
 * this is the in-code floor that works even without it.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
const MAX_TRACKED = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_TRACKED) return;
  for (const [key, w] of buckets) {
    if (w.resetAt <= now) buckets.delete(key);
  }
  // still full of live windows → drop the oldest to bound memory
  if (buckets.size >= MAX_TRACKED) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.floor(MAX_TRACKED / 4))) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** seconds until the window resets (only meaningful when ok === false) */
  retryAfter: number;
}

/**
 * @param key    identity to limit on — caller-namespaced, e.g. `discount:1.2.3.4`
 * @param limit  requests allowed per window
 * @param windowMs window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Caller IP. On Vercel x-forwarded-for is set by the platform edge and cannot
 * be spoofed by the client; the leftmost entry is the real client.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Same, for route handlers that already hold the Request. */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
