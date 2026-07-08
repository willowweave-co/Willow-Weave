"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/fields";
import { formatPKR } from "@/lib/money";
import {
  placeOrderAction,
  previewDiscountAction,
  type CheckoutResult,
} from "@/app/actions/checkout";

export function CheckoutForm({
  shippingFee,
  freeShippingThreshold,
  initialDiscountCode,
}: {
  shippingFee: number;
  freeShippingThreshold: number | null;
  initialDiscountCode: string;
}) {
  const { items, subtotal, hydrated, clear } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);

  // re-validate the code carried over from the cart page
  useEffect(() => {
    if (!initialDiscountCode || !hydrated || subtotal <= 0) return;
    previewDiscountAction(initialDiscountCode, subtotal).then((res) => {
      if (res.valid && res.amount != null) {
        setDiscount({ code: res.code ?? initialDiscountCode, amount: res.amount });
      }
    });
  }, [initialDiscountCode, hydrated, subtotal]);

  const freeShipping =
    freeShippingThreshold != null && subtotal - (discount?.amount ?? 0) >= freeShippingThreshold;
  const effectiveShipping = freeShipping ? 0 : shippingFee;
  const total = subtotal - (discount?.amount ?? 0) + effectiveShipping;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    setFormError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result: CheckoutResult = await placeOrderAction({
        ...form,
        discountCode: discount?.code ?? "",
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
      if (result.ok && result.orderNumber) {
        clear();
        router.push(`/order-confirmed/${encodeURIComponent(result.orderNumber)}`);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? "Something went wrong.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  if (!hydrated) {
    return (
      <div className="container-site py-14">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton mt-6 h-64 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="heading-display text-2xl font-semibold text-ink">Nothing to check out</h1>
        <p className="mt-2 text-sm text-umber">Your cart is empty.</p>
        <Button href="/products" className="mt-6">
          Browse products
        </Button>
      </div>
    );
  }

  return (
    <div className="container-site py-10 md:py-14">
      <h1 className="heading-display mb-2 text-3xl font-semibold text-ink">Checkout</h1>
      <p className="mb-8 flex items-center gap-2 text-sm text-umber">
        <Banknote className="h-4 w-4 text-moss" /> Cash on Delivery — you pay when the parcel
        arrives. No advance payment.
      </p>

      {formError && (
        <div className="mb-6 rounded-xl border border-madder/30 bg-madder/8 px-4 py-3 text-sm text-madder">
          {formError}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* form */}
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="rounded-2xl border border-line bg-white/50 p-6">
            <h2 className="heading-display mb-4 text-lg font-semibold text-ink">
              Contact details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  value={form.customerName}
                  onChange={set("customerName")}
                  placeholder="Ayesha Khan"
                  autoComplete="name"
                  required
                />
                <FieldError>{fieldErrors.customerName}</FieldError>
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="0300 1234567"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
                <FieldError>{fieldErrors.phone}</FieldError>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email (for order updates — optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/50 p-6">
            <h2 className="heading-display mb-4 text-lg font-semibold text-ink">
              Delivery address
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address">Complete address *</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={set("address")}
                  placeholder="House / street / area — e.g. House 12, Street 4, F-8/1"
                  autoComplete="street-address"
                  required
                />
                <FieldError>{fieldErrors.address}</FieldError>
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Lahore"
                  autoComplete="address-level2"
                  required
                />
                <FieldError>{fieldErrors.city}</FieldError>
              </div>
              <div>
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="e.g. call before delivery"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/50 p-6">
            <h2 className="heading-display mb-3 text-lg font-semibold text-ink">Payment</h2>
            <div className="flex items-center gap-3 rounded-xl border-2 border-walnut bg-parchment/70 px-4 py-3.5">
              <Banknote className="h-5 w-5 shrink-0 text-walnut" />
              <div>
                <p className="text-sm font-semibold text-ink">Cash on Delivery</p>
                <p className="text-xs text-umber">
                  Keep {formatPKR(total)} ready — our rider collects payment at your door.
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-12">
            Place order — {formatPKR(total)}
          </Button>
        </form>

        {/* summary */}
        <aside className="h-fit rounded-2xl border border-line bg-parchment/50 p-6 lg:sticky lg:top-24">
          <h2 className="heading-display text-lg font-semibold text-ink">
            Your order ({items.length})
          </h2>
          {/* pt trades margin for padding so the first row's quantity badge
              (which overhangs the thumbnail) isn't clipped by overflow-y */}
          <ul className="mt-2.5 max-h-72 space-y-3.5 overflow-y-auto pt-1.5 pr-1">
            {items.map((item) => (
              <li key={item.variantId} className="flex items-center gap-3">
                {item.image ? (
                  <span className="relative">
                    <Image
                      src={item.image}
                      alt=""
                      width={52}
                      height={64}
                      className="h-16 w-13 rounded-lg object-cover"
                    />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-walnut px-1 text-[0.65rem] font-semibold text-ivory">
                      {item.quantity}
                    </span>
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-medium text-ink">{item.title}</span>
                  <span className="text-xs text-umber">
                    {[item.color, item.size].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-sm font-medium text-ink">
                  {formatPKR(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-bark">Subtotal</dt>
              <dd className="font-medium">{formatPKR(subtotal)}</dd>
            </div>
            {discount && (
              <div className="flex justify-between text-moss">
                <dt>Discount ({discount.code})</dt>
                <dd>−{formatPKR(discount.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-bark">Delivery</dt>
              <dd className="font-medium">
                {effectiveShipping === 0 ? "Free" : formatPKR(effectiveShipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total (COD)</dt>
              <dd>{formatPKR(total)}</dd>
            </div>
          </dl>
          <ul className="mt-5 space-y-2 text-xs text-umber">
            <li className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 shrink-0" /> Dispatch in 1–3 business days, delivery
              2–7 days
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Checked & carefully packed before
              dispatch
            </li>
          </ul>
          <p className="mt-4 text-center text-xs text-umber">
            Need to change something? <Link href="/cart" className="text-walnut underline underline-offset-2">Back to cart</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
