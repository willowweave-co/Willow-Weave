import { Skeleton } from "@/components/ui/skeleton";

/** Instant skeleton for a product page — gallery left, details right. */
export default function ProductLoading() {
  return (
    <div className="container-site py-6 md:py-10">
      <Skeleton className="mb-5 h-3 w-56 max-w-full" />

      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] rounded-xl" />

        <div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-8 w-full" />
          <Skeleton className="mt-2 h-8 w-3/5" />
          <Skeleton className="mt-6 h-7 w-40" />
          <div className="mt-5 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-14 rounded-full" />
            ))}
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
          <Skeleton className="mt-4 h-14 w-full rounded-xl" />
          <div className="mt-8 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
