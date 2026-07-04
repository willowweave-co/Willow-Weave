"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import type { FacetData } from "@/lib/catalog-filters";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * URL-synced filters for /products. Every change is written to the query
 * string (shareable, back-button friendly); the server re-filters.
 */

function FilterGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-line py-1">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-xs font-semibold tracking-[0.12em] text-ink uppercase select-none [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-umber transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm text-bark hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-line accent-walnut"
      />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-umber/70">{count}</span>}
    </label>
  );
}

export function FiltersPanel({ facets, resultCount }: { facets: FacetData; resultCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, startTransition] = useTransition();

  const current = useMemo(() => {
    const list = (k: string) => searchParams.get(k)?.split(",").filter(Boolean) ?? [];
    return {
      collection: searchParams.get("collection") ?? "",
      fabrics: list("fabric"),
      types: list("type"),
      sizes: list("size"),
      colors: list("color"),
      sale: searchParams.get("sale") === "1",
      stock: searchParams.get("stock") === "1",
      min: searchParams.get("min") ?? "",
      max: searchParams.get("max") ?? "",
    };
  }, [searchParams]);

  const [minInput, setMinInput] = useState(current.min);
  const [maxInput, setMaxInput] = useState(current.max);
  useEffect(() => {
    setMinInput(current.min);
    setMaxInput(current.max);
  }, [current.min, current.max]);

  const activeCount =
    (current.collection ? 1 : 0) +
    current.fabrics.length +
    current.types.length +
    current.sizes.length +
    current.colors.length +
    (current.sale ? 1 : 0) +
    (current.stock ? 1 : 0) +
    (current.min ? 1 : 0) +
    (current.max ? 1 : 0);

  function commit(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.replace(`/products?${params.toString()}` as never, { scroll: false });
    });
  }

  const toggleList = (key: string, value: string) =>
    commit((p) => {
      const values = new Set(p.get(key)?.split(",").filter(Boolean) ?? []);
      if (values.has(value)) values.delete(value);
      else values.add(value);
      if (values.size) p.set(key, [...values].join(","));
      else p.delete(key);
    });

  const setFlag = (key: string, on: boolean) =>
    commit((p) => (on ? p.set(key, "1") : p.delete(key)));

  const applyPrice = () =>
    commit((p) => {
      if (minInput && Number(minInput) > 0) p.set("min", minInput);
      else p.delete("min");
      if (maxInput && Number(maxInput) > 0) p.set("max", maxInput);
      else p.delete("max");
    });

  const clearAll = () =>
    commit((p) => {
      ["collection", "fabric", "type", "size", "color", "sale", "stock", "min", "max"].forEach(
        (k) => p.delete(k)
      );
    });

  const groupedCollections = useMemo(() => {
    const order = ["occasions", "volumes", "pieces", "fabrics"] as const;
    const labels = {
      occasions: "Occasions",
      volumes: "Volumes",
      pieces: "By Piece",
      fabrics: "By Fabric",
    };
    return order
      .map((g) => ({
        label: labels[g],
        items: facets.collections.filter((c) => c.group === g),
      }))
      .filter((g) => g.items.length);
  }, [facets.collections]);

  const panel = (
    <div className="space-y-1">
      <FilterGroup label="Collection">
        <select
          value={current.collection}
          onChange={(e) =>
            commit((p) => {
              if (e.target.value) p.set("collection", e.target.value);
              else p.delete("collection");
            })
          }
          className="w-full rounded-lg border border-line bg-white/70 px-3 py-2 text-sm focus:border-walnut focus:outline-none"
          aria-label="Filter by collection"
        >
          <option value="">All collections</option>
          {groupedCollections.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((c) => (
                <option key={c.handle} value={c.handle}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="Type">
        {facets.types.map((t) => (
          <CheckRow
            key={t}
            label={t}
            checked={current.types.includes(t)}
            onChange={() => toggleList("type", t)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Fabric">
        {facets.fabrics.map((f) => (
          <CheckRow
            key={f}
            label={f}
            checked={current.fabrics.includes(f)}
            onChange={() => toggleList("fabric", f)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Size in stock">
        <div className="flex flex-wrap gap-2 pt-1">
          {facets.sizes.map((s) => (
            <button
              key={s}
              onClick={() => toggleList("size", s)}
              className={cn(
                "min-w-10 rounded-full border px-3 py-1.5 text-sm transition-colors",
                current.sizes.includes(s)
                  ? "border-walnut bg-walnut text-ivory"
                  : "border-line bg-white/60 text-bark hover:border-walnut/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>

      {facets.colors.length > 0 && (
        <FilterGroup label="Colour" defaultOpen={false}>
          {facets.colors.map((c) => (
            <CheckRow
              key={c}
              label={c}
              checked={current.colors.includes(c)}
              onChange={() => toggleList("color", c)}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup label="Price (PKR)">
        <div className="flex items-center gap-2 pt-1">
          <input
            inputMode="numeric"
            placeholder={String(facets.priceMin)}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ""))}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            className="w-full rounded-lg border border-line bg-white/70 px-3 py-2 text-sm focus:border-walnut focus:outline-none"
            aria-label="Minimum price"
          />
          <span className="text-umber">–</span>
          <input
            inputMode="numeric"
            placeholder={String(facets.priceMax)}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ""))}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            className="w-full rounded-lg border border-line bg-white/70 px-3 py-2 text-sm focus:border-walnut focus:outline-none"
            aria-label="Maximum price"
          />
        </div>
        <p className="mt-1.5 text-[0.7rem] text-umber">
          Range: {formatPKR(facets.priceMin)} – {formatPKR(facets.priceMax)}
        </p>
      </FilterGroup>

      <div className="space-y-1 pt-3">
        <CheckRow label="On sale" checked={current.sale} onChange={() => setFlag("sale", !current.sale)} />
        <CheckRow
          label="In stock only"
          checked={current.stock}
          onChange={() => setFlag("stock", !current.stock)}
        />
      </div>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="mt-4 w-full rounded-full border border-line py-2 text-sm font-medium text-bark transition-colors hover:border-madder hover:text-madder"
        >
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-64 shrink-0 self-start overflow-y-auto pr-2 lg:block">
        {panel}
      </aside>

      {/* mobile trigger + sheet */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-bark lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-walnut text-[0.65rem] text-ivory">
            {activeCount}
          </span>
        )}
      </button>
      <div
        className={cn(
          "fixed inset-0 z-[85] lg:hidden",
          mobileOpen ? "" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-ink/45 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-ivory shadow-2xl transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="heading-display text-lg font-semibold">Filters</p>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close filters"
              className="rounded-full p-1.5 text-bark hover:bg-linen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3">{panel}</div>
          <div className="border-t border-line p-4">
            <button
              onClick={() => setMobileOpen(false)}
              className="w-full rounded-full bg-walnut py-3 text-sm font-medium text-ivory"
            >
              Show {resultCount} {resultCount === 1 ? "result" : "results"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
