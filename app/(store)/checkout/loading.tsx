import { Skeleton } from "@/components/ui/skeleton";

/** Instant skeleton for checkout — form fields left, order summary right. */
export default function CheckoutLoading() {
  return (
    <div className="container-site py-8 md:py-12">
      <Skeleton className="h-9 w-48" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-2 h-11 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="mt-2 h-12 w-full rounded-full" />
        </div>
        <div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
