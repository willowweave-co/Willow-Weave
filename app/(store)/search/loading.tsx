import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

/** Instant skeleton for search results. */
export default function SearchLoading() {
  return (
    <div className="container-site py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-9 w-80 max-w-full" />
        <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      </header>
      <Skeleton className="mb-10 h-12 w-full max-w-2xl rounded-xl" />
      <Skeleton className="mb-5 h-6 w-40" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
