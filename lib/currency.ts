/**
 * Display-currency support. Prices are ALWAYS charged in PKR (COD) — other
 * currencies are approximate conversions for international shoppers, marked
 * with "≈". Client-safe constants + formatting.
 */
import { formatPKR } from "@/lib/money";

export const CURRENCIES = [
  { code: "PKR", label: "🇵🇰 PKR — Pakistani Rupee" },
  { code: "USD", label: "🇺🇸 USD — US Dollar" },
  { code: "GBP", label: "🇬🇧 GBP — British Pound" },
  { code: "EUR", label: "🇪🇺 EUR — Euro" },
  { code: "AED", label: "🇦🇪 AED — UAE Dirham" },
  { code: "SAR", label: "🇸🇦 SAR — Saudi Riyal" },
  { code: "CAD", label: "🇨🇦 CAD — Canadian Dollar" },
  { code: "AUD", label: "🇦🇺 AUD — Australian Dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === "string" && CURRENCIES.some((c) => c.code === v);
}

/** Units of each currency per 1 PKR — refreshed twice a day from open.er-api.com;
 *  these are the safety-net values if the rates API is ever unreachable. */
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 0.0036,
  GBP: 0.0027,
  EUR: 0.0031,
  AED: 0.0132,
  SAR: 0.0135,
  CAD: 0.0049,
  AUD: 0.0054,
};

/** ISO-3166 country code → the currency shoppers there expect to see.
 *  Unlisted countries fall back to USD; Pakistan (and unknown) to PKR. */
export const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SA: "SAR",
  CA: "CAD",
  AU: "AUD",
  // eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR",
  AT: "EUR", BE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
};

export function currencyForCountry(code: string | null): CurrencyCode {
  if (!code) return "PKR";
  return COUNTRY_TO_CURRENCY[code.toUpperCase()] ?? (code.toUpperCase() === "PK" ? "PKR" : "USD");
}

/**
 * Formats a PKR amount in the shopper's display currency, converted at the
 * weekly-updated rate (this is what international customers are charged).
 */
export function formatMoney(
  amountPKR: number,
  currency: CurrencyCode,
  rates: Record<string, number>
): string {
  if (currency === "PKR") return formatPKR(amountPKR);
  const rate = rates[currency] ?? FALLBACK_RATES[currency];
  const converted = amountPKR * rate;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: converted >= 100 ? 0 : 2,
  }).format(converted);
}
