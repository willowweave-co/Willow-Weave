import { Loader2 } from "lucide-react";

/**
 * Every dashboard page is rendered per request (force-dynamic), so page
 * switches inside the admin used to sit on the old screen with no feedback.
 * This shows inside the admin chrome the moment a nav link is clicked.
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-walnut" aria-label="Loading" />
    </div>
  );
}
