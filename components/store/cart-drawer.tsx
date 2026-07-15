"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/components/store/currency-context";

export function CartDrawer({
  freeShippingThreshold,
}: {
  freeShippingThreshold: number | null;
}) {
  const { items, subtotal, isOpen, closeCart, updateQuantity, removeItem } = useCart();
  const { format } = useCurrency();
  const pathname = usePathname();

  // Safety net: whatever triggers a navigation (checkout button, back button,
  // a link we forgot onClick on), the drawer must not stay covering the page.
  useEffect(() => {
    closeCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on route change only
  }, [pathname]);

  const remaining =
    freeShippingThreshold != null ? Math.max(0, freeShippingThreshold - subtotal) : null;

  return (
    <Dialog open={isOpen} onClose={closeCart} title="Your Cart" side="right">
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-parchment">
            <ShoppingBag className="h-7 w-7 text-umber" />
          </span>
          <p className="text-bark">Your cart is empty</p>
          <Button href="/products" variant="outline" onClick={closeCart}>
            Continue shopping
          </Button>
        </div>
      ) : (
        <>
          {remaining != null && (
            <div className="border-b border-line bg-parchment/60 px-5 py-2.5 text-center text-xs text-bark">
              {remaining > 0 ? (
                <>
                  Add <strong>{format(remaining)}</strong> more for free shipping
                </>
              ) : (
                <strong className="text-moss">You’ve unlocked free shipping 🎉</strong>
              )}
            </div>
          )}
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-3.5 py-4">
                <Link
                  href={`/products/${item.handle}`}
                  onClick={closeCart}
                  className="shrink-0"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={72}
                      height={90}
                      className="h-[5.6rem] w-[4.5rem] rounded-lg object-cover"
                    />
                  ) : (
                    <span className="block h-[5.6rem] w-[4.5rem] rounded-lg bg-parchment" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/products/${item.handle}`}
                    onClick={closeCart}
                    className="line-clamp-2 text-sm font-medium text-ink hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-umber">
                    {[item.color, item.size].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-full border border-line">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="p-1.5 text-bark hover:text-walnut"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="p-1.5 text-bark hover:text-walnut disabled:opacity-30"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-ink">
                      {format(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
                <button
                  aria-label={`Remove ${item.title}`}
                  onClick={() => removeItem(item.variantId)}
                  className="self-start p-1 text-umber/60 transition-colors hover:text-madder"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line bg-ivory px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-bark">Subtotal</span>
              <span className="text-lg font-semibold text-ink">{format(subtotal)}</span>
            </div>
            <p className="mb-3 text-center text-xs text-umber">
              Cash on Delivery · shipping calculated at checkout
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button href="/cart" variant="outline" onClick={closeCart}>
                View cart
              </Button>
              <Button href="/checkout" onClick={closeCart}>
                Checkout
              </Button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
