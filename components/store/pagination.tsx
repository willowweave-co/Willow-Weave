"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * URL-driven pagination for the catalog (?page=N, page 1 keeps a clean URL).
 * Filters/sort live in the same query string and reset the page when they
 * change. Each link swaps to a spinner while its navigation is in flight
 * (useLinkStatus), so a click on a slow connection visibly "took".
 */

/** Page numbers to render: all of them when few, else 1 … around-current … last. */
function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const shown = new Set([1, total, current - 1, current, current + 1]);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (let n = 1; n <= total; n++) {
    if (!shown.has(n)) continue;
    if (n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

function LinkLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{children}</>;
}

export function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  const href = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const q = params.toString();
    return (q ? `${pathname}?${q}` : pathname) as never;
  };

  const pill =
    "flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {currentPage > 1 ? (
        <Link href={href(currentPage - 1)} aria-label="Previous page"
          className={cn(pill, "border-line bg-white/60 text-bark hover:border-walnut/50")}>
          <LinkLabel><ChevronLeft className="h-4 w-4" /></LinkLabel>
        </Link>
      ) : (
        <span aria-hidden className={cn(pill, "border-line/60 text-umber/40")}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pageList(currentPage, totalPages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-sm text-umber">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-label={`Page ${n}`}
            aria-current={n === currentPage ? "page" : undefined}
            className={cn(
              pill,
              n === currentPage
                ? "border-walnut bg-walnut font-medium text-ivory"
                : "border-line bg-white/60 text-bark hover:border-walnut/50"
            )}
          >
            <LinkLabel>{n}</LinkLabel>
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link href={href(currentPage + 1)} aria-label="Next page"
          className={cn(pill, "border-line bg-white/60 text-bark hover:border-walnut/50")}>
          <LinkLabel><ChevronRight className="h-4 w-4" /></LinkLabel>
        </Link>
      ) : (
        <span aria-hidden className={cn(pill, "border-line/60 text-umber/40")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
