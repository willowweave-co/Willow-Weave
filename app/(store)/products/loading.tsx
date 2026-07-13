import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

/** Instant skeleton for the catalog — mirrors the real page's layout. */
export default function ProductsLoading() {
  return (
    <div className="container-site py-8 md:py-10">
      <header className="mb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </header>

      <div className="lg:flex lg:gap-8">
        {/* desktop filter rail */}
        <div className="hidden w-64 shrink-0 space-y-3 pr-2 lg:block">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* mobile "Filter & refine" bar */}
          <Skeleton className="mb-5 h-12 w-full rounded-xl lg:hidden" />
          <div className="mb-5 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
          <ProductGridSkeleton count={12} className="lg:grid-cols-3 xl:grid-cols-4" />
        </div>
      </div>
    </div>
  );
}
