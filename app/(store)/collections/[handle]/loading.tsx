import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

/** Instant skeleton for a collection — banner band, then title + grid. */
export default function CollectionLoading() {
  return (
    <div>
      {/* full-bleed banner placeholder, pulled up behind the header like the real one */}
      <div className="-mt-14 h-64 w-full sm:h-72 md:-mt-16 md:h-80">
        <Skeleton className="h-full w-full rounded-none" />
      </div>

      <div className="container-site py-8">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 mb-6 flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
