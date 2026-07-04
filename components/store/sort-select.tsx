"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SORT_OPTIONS, type SortKey } from "@/lib/catalog-filters";

export function SortSelect({ current }: { current: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-umber">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === "featured") params.delete("sort");
          else params.set("sort", e.target.value);
          router.replace(`${pathname}?${params.toString()}` as never, { scroll: false });
        }}
        className="rounded-lg border border-line bg-white/70 px-3 py-2 text-sm text-ink focus:border-walnut focus:outline-none"
        aria-label="Sort products"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
