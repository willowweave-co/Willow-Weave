"use client";

import { Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { OPEN_SEARCH_EVENT } from "./search-events";

export function HeaderActions() {
  const { count, hydrated, openCart } = useCart();

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
        aria-label="Search the store (Ctrl+K)"
        className="focus-ring tap-44 rounded-full p-2.5 text-bark transition-colors hover:bg-linen hover:text-walnut"
      >
        <Search className="h-[1.375rem] w-[1.375rem]" />
      </button>
      <button
        onClick={openCart}
        aria-label={`Open cart, ${count} items`}
        className="focus-ring tap-44 relative rounded-full p-2.5 text-bark transition-colors hover:bg-linen hover:text-walnut"
      >
        <ShoppingBag className="h-[1.375rem] w-[1.375rem]" />
        {hydrated && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-walnut px-1 text-[0.65rem] font-semibold text-ivory">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    </div>
  );
}
