import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

/** Instant skeleton for a collection — banner band, then title + grid. */
export default function CollectionLoading() {
  return (
    <div>
      {/* full-bleed banner placeholder, pulled up behind the header like the
          real one — these offsets track the header's height, so they move
          with it (see components/store/header.tsx) */}
      <div className="-mt-16 h-[16.5rem] w-full sm:h-[18.5rem] md:-mt-20 md:h-[21rem]">
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
