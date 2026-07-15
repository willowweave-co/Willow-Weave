// Server-only: fetches live PKR exchange rates (cached half a day).
import { CURRENCIES, FALLBACK_RATES } from "@/lib/currency";

/**
 * PKR → display-currency rates from open.er-api.com (free, no key).
 * Cached for 7 DAYS on purpose: international shoppers see stable prices for
 * a week instead of amounts that wobble daily (owner's trust decision).
 * Any failure falls back to static approximations so the storefront never
 * breaks over a rates API.
 */
export async function getRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/PKR", {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return FALLBACK_RATES;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates) return FALLBACK_RATES;
    const out: Record<string, number> = {};
    for (const { code } of CURRENCIES) {
      out[code] = typeof data.rates[code] === "number" ? data.rates[code] : FALLBACK_RATES[code];
    }
    return out;
  } catch {
    return FALLBACK_RATES;
  }
}
