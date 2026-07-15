"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CURRENCIES,
  currencyForCountry,
  formatMoney,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";

const STORAGE_KEY = "ww-currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Formats a PKR amount in the shopper's display currency ("≈ $18" abroad). */
  format: (amountPKR: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Display-currency state. SSR and the first client render always use PKR
 * (so static pages hydrate cleanly); after mount we restore the visitor's
 * saved choice, or geo-detect a sensible default once via /api/geo.
 */
export function CurrencyProvider({
  rates,
  children,
}: {
  rates: Record<string, number>;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("PKR");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(saved)) {
      setCurrencyState(saved);
      return;
    }
    let cancelled = false;
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: { country?: string }) => {
        if (!cancelled) setCurrencyState(currencyForCountry(data.country ?? null));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* private mode — the choice just won't persist */
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      format: (amountPKR: number) => formatMoney(amountPKR, currency, rates),
    }),
    [currency, setCurrency, rates]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}

/** Footer dropdown; the choice is remembered and applies store-wide. */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className={`relative inline-flex items-center ${className ?? ""}`}>
      <span className="sr-only">Display currency</span>
      {/* appearance-none kills the native arrow (which hugged the edge and
          always pointed down even though the menu opens UPWARD from the
          footer); the ⇕ glyph reads direction-neutral. */}
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className="appearance-none rounded-full border border-line bg-white/70 py-1.5 pr-8 pl-3 text-xs text-bark focus:border-walnut focus:outline-none"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-umber"
      >
        <path d="m7 15 5 5 5-5" />
        <path d="m7 9 5-5 5 5" />
      </svg>
    </label>
  );
}
