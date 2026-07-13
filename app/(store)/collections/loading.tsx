import { Skeleton } from "@/components/ui/skeleton";

/** Instant skeleton for the collections index — grouped tile grids. */
export default function CollectionsLoading() {
  return (
    <div className="container-site py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-64 max-w-full" />
        <Skeleton className="mt-4 h-4 w-96 max-w-full" />
      </header>

      {Array.from({ length: 2 }, (_, s) => (
        <section key={s} className="mb-12">
          <div className="mb-5 border-b border-line pb-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
