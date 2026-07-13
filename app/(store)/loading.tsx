import { Loader2 } from "lucide-react";

/**
 * Fallback loading state for store pages without a dedicated skeleton
 * (cart, order-confirmed, policies…). Appears instantly on navigation so a
 * click never feels like it didn't register.
 */
export default function StoreLoading() {
  return (
    <div className="container-site flex min-h-[50vh] items-center justify-center py-20">
      <Loader2 className="h-7 w-7 animate-spin text-walnut" aria-label="Loading page" />
    </div>
  );
}
