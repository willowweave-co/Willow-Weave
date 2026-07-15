"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, TicketPercent } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { useCurrency } from "@/components/store/currency-context";
import { previewDiscountAction } from "@/app/actions/checkout";

export function CartPageContent({
  shippingFee,
  freeShippingThreshold,
}: {
  shippingFee: number;
  freeShippingThreshold: number | null;
}) {
  const { items, subtotal, hydrated, updateQuantity, removeItem } = useCart();
  const { format } = useCurrency();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; amount: number } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const freeShipping =
    freeShippingThreshold != null && subtotal - (applied?.amount ?? 0) >= freeShippingThreshold;
  const effectiveShipping = items.length === 0 || freeShipping ? 0 : shippingFee;
  const total = subtotal - (applied?.amount ?? 0) + effectiveShipping;

  const applyCode = () => {
    if (!code.trim()) return;
    setCodeError(null);
    startTransition(async () => {
      const res = await previewDiscountAction(code, subtotal);
      if (res.valid && res.amount != null) {
        setApplied({ code: res.code ?? code.trim().toUpperCase(), amount: res.amount });
      } else {
        setApplied(null);
        setCodeError("This code isn't valid for your cart.");
      }
    });
  };

  if (!hydrated) {
    return (
      <div className="container-site py-14">
        <div className="skeleton h-8 w-44" />
        <div className="skeleton mt-6 h-32 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-site flex flex-col items-center py-24 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-parchment">
          <ShoppingBag className="h-8 w-8 text-umber" />
        </span>
        <h1 className="heading-display mt-5 text-2xl font-semibold text-ink">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-sm text-umber">
          Discover breezy lawn suits, silks and chiffons — all with Cash on Delivery.
        </p>
        <Button href="/products" size="lg" className="mt-6">
          Start shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="container-site py-10 md:py-14">
      <h1 className="heading-display mb-8 text-3xl font-semibold text-ink">Your Cart</h1>
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* items */}
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white/50 px-5">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-4 py-5">
              <Link href={`/products/${item.handle}`} className="shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={96}
                    height={120}
                    className="h-28 w-[5.6rem] rounded-xl object-cover"
                  />
                ) : (
                  <span className="block h-28 w-[5.6rem] rounded-xl bg-parchment" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/products/${item.handle}`}
                      className="font-medium text-ink hover:underline hover:underline-offset-4"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-umber">
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeItem(item.variantId)}
                    className="p-1 text-umber/60 transition-colors hover:text-madder"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-line bg-white/70">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-2.5 py-2 text-bark hover:text-walnut"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="px-2.5 py-2 text-bark hover:text-walnut disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">
                      {format(item.unitPrice * item.quantity)}
                    </p>
                    {item.quantity >= item.maxStock && (
                      <p className="text-[0.7rem] text-madder">Max stock reached</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* summary */}
        <aside className="h-fit rounded-2xl border border-line bg-parchment/50 p-6">
          <h2 className="heading-display text-lg font-semibold text-ink">Order Summary</h2>

          {/* discount code */}
          <div className="mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TicketPercent className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Discount code"
                  className="pl-9 uppercase"
                  onKeyDown={(e) => e.key === "Enter" && applyCode()}
                />
              </div>
              <Button variant="outline" onClick={applyCode} loading={pending}>
                Apply
              </Button>
            </div>
            {codeError && <p className="mt-1.5 text-xs text-madder">{codeError}</p>}
            {applied && (
              <p className="mt-1.5 text-xs text-moss">
                Code <strong>{applied.code}</strong> applied — you save {format(applied.amount)}
              </p>
            )}
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-bark">Subtotal</dt>
              <dd className="font-medium text-ink">{format(subtotal)}</dd>
            </div>
            {applied && (
              <div className="flex justify-between text-moss">
                <dt>Discount ({applied.code})</dt>
                <dd>−{format(applied.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-bark">Delivery</dt>
              <dd className="font-medium text-ink">
                {effectiveShipping === 0 ? "Free" : format(effectiveShipping)}
              </dd>
            </div>
            {freeShippingThreshold != null && !freeShipping && (
              <p className="text-xs text-umber">
                Free delivery on orders over {format(freeShippingThreshold)}
              </p>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
              <dt>Total</dt>
              <dd>{format(total)}</dd>
            </div>
          </dl>

          <Button
            href={applied ? `/checkout?code=${encodeURIComponent(applied.code)}` : "/checkout"}
            size="lg"
            className="mt-5 w-full"
          >
            Checkout — Cash on Delivery
          </Button>
          <p className="mt-3 text-center text-xs text-umber">
            No card needed. Pay in cash when your order arrives.
          </p>
        </aside>
      </div>
    </div>
  );
}
