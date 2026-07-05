"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Check, AlertTriangle } from "lucide-react";
import { setStockAction } from "@/app/actions/admin";
import { useToast } from "@/components/ui/toast";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface InventoryRow {
  productId: string;
  productTitle: string;
  handle: string;
  image: string | null;
  variantId: string;
  label: string;
  price: number;
  stock: number;
  published: boolean;
}

function StockCell({ row }: { row: InventoryRow }) {
  const [value, setValue] = useState(String(row.stock));
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const commit = () => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setValue(String(n));
    if (n === row.stock && saved) return;
    startTransition(async () => {
      const res = await setStockAction(row.productId, row.variantId, n);
      if (res.ok) {
        setSaved(true);
        row.stock = n;
      } else {
        toast(res.error ?? "Couldn't update stock.", "error");
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value.replace(/\D/g, ""));
          setSaved(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={cn(
          "h-9 w-16 rounded-lg border bg-white/70 px-2 text-center text-sm focus:outline-none sm:w-20 sm:px-2.5",
          Number(value) === 0
            ? "border-madder/50 text-madder"
            : "border-line focus:border-walnut"
        )}
        aria-label={`Stock for ${row.productTitle} ${row.label}`}
      />
      <span className="w-4">
        {pending ? (
          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-walnut" />
        ) : saved ? (
          <Check className="h-3.5 w-3.5 text-moss" />
        ) : null}
      </span>
    </span>
  );
}

export function InventoryTable({
  rows,
  initialLowOnly,
  initialQuery,
}: {
  rows: InventoryRow[];
  initialLowOnly: boolean;
  initialQuery: string;
}) {
  const [lowOnly, setLowOnly] = useState(initialLowOnly);
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (lowOnly && r.stock > 3) return false;
      if (q && !`${r.productTitle} ${r.label}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, lowOnly, query]);

  const totalUnits = rows.reduce((n, r) => n + r.stock, 0);
  const outCount = rows.filter((r) => r.stock === 0).length;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="heading-display text-2xl font-semibold text-ink">Inventory</h1>
        <p className="mt-1 text-sm text-umber">
          {totalUnits.toLocaleString()} units across {rows.length} variants ·{" "}
          <span className={outCount ? "font-medium text-madder" : ""}>
            {outCount} out of stock
          </span>
          . Edit a number and press Enter — it saves instantly.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-44 flex-1 sm:flex-none">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or variant…"
            className="w-full rounded-full border border-line bg-white/70 py-2 pr-4 pl-9 text-sm focus:border-walnut focus:outline-none sm:w-64"
          />
        </div>
        <button
          onClick={() => setLowOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors",
            lowOnly
              ? "border-madder bg-madder text-ivory"
              : "border-line bg-white/60 text-bark hover:border-madder/50"
          )}
        >
          <AlertTriangle className="h-4 w-4" /> Low stock only (≤3)
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white/60">
        <table className="w-full text-sm sm:min-w-[640px]">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
              <th className="px-3 py-3.5 font-medium sm:px-5">Product</th>
              <th className="px-2 py-3.5 font-medium sm:px-4">Variant</th>
              <th className="hidden px-4 py-3.5 font-medium sm:table-cell">Price</th>
              <th className="px-2 py-3.5 font-medium sm:px-4">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr key={r.variantId} className="transition-colors hover:bg-linen/40">
                <td className="px-3 py-2.5 sm:px-5">
                  <div className="flex items-center gap-3">
                    {r.image ? (
                      <Image
                        src={r.image}
                        alt=""
                        width={36}
                        height={45}
                        className="hidden h-11 w-9 shrink-0 rounded-md object-cover sm:block"
                      />
                    ) : (
                      <span className="hidden h-11 w-9 shrink-0 rounded-md bg-parchment sm:block" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${r.productId}` as never}
                        className="line-clamp-2 font-medium text-ink hover:underline sm:line-clamp-1"
                      >
                        {r.productTitle}
                      </Link>
                      {!r.published && <span className="text-xs text-umber">Draft</span>}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-bark sm:px-4">{r.label}</td>
                <td className="hidden px-4 py-2.5 text-bark sm:table-cell">{formatPKR(r.price)}</td>
                <td className="px-2 py-2.5 sm:px-4">
                  <StockCell row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="py-14 text-center text-sm text-umber">
            {lowOnly ? "Nothing is low on stock 🎉" : "No variants match that search."}
          </p>
        )}
      </div>
    </div>
  );
}
