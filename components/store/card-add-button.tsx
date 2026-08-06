"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import type { CartItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Quick-add on product cards: "Add to cart" appears on hover (always visible
 * on touch screens), then turns into a − qty + stepper once the item is in
 * the cart. Adds the first in-stock variant; sizes can be changed in the cart
 * or on the product page.
 *
 * No longer nested inside the card's <Link> — it now sits at z-10, above the
 * anchor's ::before overlay — but the handlers still stop the event: the
 * overlay is a sibling, and swallowing the click here keeps a tap on the
 * pill's own padding from falling through to navigation.
 */
export function CardAddButton({ item }: { item: Omit<CartItem, "quantity"> }) {
  const { items, addItem, updateQuantity, hydrated } = useCart();
  // wait for the cart to hydrate so SSR markup and first client render match
  if (!hydrated) return null;

  const qty = items.find((x) => x.variantId === item.variantId)?.quantity ?? 0;

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onClick={stop}
      className={cn(
        "absolute inset-x-2 bottom-2 z-10 transition-all duration-200",
        qty > 0
          ? "opacity-100"
          : // touch devices have no hover — keep it visible there
            "sm:pointer-events-none sm:translate-y-1 sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
      )}
    >
      {qty === 0 ? (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            addItem(item, 1, { open: false });
          }}
          className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-full bg-ivory/95 py-2 text-xs font-semibold text-ink shadow-md shadow-ink/10 backdrop-blur-sm transition-colors hover:bg-gold"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Add to cart
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-full bg-ivory/95 shadow-md shadow-ink/10 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Remove one"
            onClick={(e) => {
              stop(e);
              updateQuantity(item.variantId, qty - 1);
            }}
            className="focus-ring rounded-full p-2 text-bark transition-colors hover:text-madder"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span aria-live="polite" className="text-xs font-semibold text-ink tabular-nums">
            {qty} in cart
          </span>
          <button
            type="button"
            aria-label="Add one more"
            disabled={qty >= item.maxStock}
            onClick={(e) => {
              stop(e);
              updateQuantity(item.variantId, qty + 1);
            }}
            className="focus-ring rounded-full p-2 text-bark transition-colors hover:text-moss disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
