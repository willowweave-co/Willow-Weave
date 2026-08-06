"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Globe, Landmark, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/fields";
import { DOMESTIC_COUNTRY } from "@/lib/countries";
import { useCurrency } from "@/components/store/currency-context";
import type { BankTransferSettings, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  placeOrderAction,
  previewDiscountAction,
  type CheckoutResult,
} from "@/app/actions/checkout";

const DRAFT_KEY = "ww:checkout-draft";

interface CheckoutDraft {
  form: {
    customerName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    notes: string;
  };
  country: string;
  payment: PaymentMethod;
}

export function CheckoutForm({
  shippingFee,
  freeShippingThreshold,
  initialDiscountCode,
  intlCountries,
  intlNote,
  bank,
  contactEmail,
  whatsapp,
}: {
  shippingFee: number;
  freeShippingThreshold: number | null;
  initialDiscountCode: string;
  /** Countries enabled for international shipping, with their fee (Rs). */
  intlCountries: { name: string; fee: number }[];
  intlNote: string;
  /** Bank-transfer details, or null when the owner hasn't set them up. */
  bank: BankTransferSettings | null;
  contactEmail: string;
  whatsapp: string;
}) {
  const { items, subtotal, hydrated, clear } = useCart();
  const { format, currency } = useCurrency();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [payment, setPayment] = useState<PaymentMethod>("cod");

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  });
  const [country, setCountry] = useState(DOMESTIC_COUNTRY);
  const isDomestic = country === DOMESTIC_COUNTRY;
  const intlFee = intlCountries.find((c) => c.name === country)?.fee ?? 0;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);

  // ── Draft recovery ──────────────────────────────────────────────────────
  // Most of our traffic is phones, where a WhatsApp notification mid-checkout
  // is routine. All of this lived in useState, so coming back to a reloaded
  // tab meant re-typing a full name, phone and address — the single most
  // expensive place in the store to lose someone.
  //
  // sessionStorage, deliberately, NOT localStorage: this is a customer's real
  // name, phone number and home address. Session scope survives a reload, an
  // app switch and an OS tab eviction — everything we actually need — while
  // still clearing when the tab closes, so it can't sit on a shared or family
  // phone indefinitely.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<CheckoutDraft>;
        if (draft.form) setForm((f) => ({ ...f, ...draft.form }));
        if (typeof draft.country === "string") setCountry(draft.country);
        // only honour a saved "bank" if the owner still has transfer enabled,
        // otherwise the selection points at an option that isn't rendered
        if (draft.payment === "bank" && bank) setPayment("bank");
      }
    } catch {
      // private mode, a full quota or a corrupt entry must never be the
      // reason someone can't check out — fall through to a blank form
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gated on `restored` so the first render's empty state can't overwrite
  // the very draft we're about to read back.
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, country, payment }));
    } catch {
      // ignore — persistence is a convenience, never a requirement
    }
  }, [restored, form, country, payment]);

  // re-validate the code carried over from the cart page
  useEffect(() => {
    if (!initialDiscountCode || !hydrated || subtotal <= 0) return;
    previewDiscountAction(initialDiscountCode, subtotal).then((res) => {
      if (res.valid && res.amount != null) {
        setDiscount({ code: res.code ?? initialDiscountCode, amount: res.amount });
      }
    });
  }, [initialDiscountCode, hydrated, subtotal]);

  // free-shipping threshold is a domestic (Pakistan) perk only
  const freeShipping =
    isDomestic &&
    freeShippingThreshold != null &&
    subtotal - (discount?.amount ?? 0) >= freeShippingThreshold;
  const effectiveShipping = isDomestic ? (freeShipping ? 0 : shippingFee) : intlFee;
  const total = subtotal - (discount?.amount ?? 0) + effectiveShipping;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    setFormError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result: CheckoutResult = await placeOrderAction({
        ...form,
        country,
        paymentMethod: payment,
        currency,
        discountCode: discount?.code ?? "",
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
      if (result.ok && result.orderNumber) {
        clear();
        // the order exists now; keeping the address around serves nobody
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          // nothing to do — the entry expires with the tab regardless
        }
        router.push(`/order-confirmed/${encodeURIComponent(result.orderNumber)}`);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        // The old fallback ("Something went wrong.") left the one question
        // that actually matters unanswered — was I charged / did it go
        // through? Nothing is charged on COD and the order isn't created
        // unless the action succeeds, so say that plainly.
        setFormError(
          result.error ??
            "We couldn't place your order just now. Nothing has been ordered and you haven't paid anything — your details are still filled in below, so please try again."
        );
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
                <Label htmlFor="country">Country *</Label>
                <Select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  autoComplete="country-name"
                >
                  <option value={DOMESTIC_COUNTRY}>{DOMESTIC_COUNTRY}</option>
                  {intlCountries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <FieldError>{fieldErrors.country}</FieldError>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="e.g. call before delivery"
                />
              </div>
            </div>
            {!isDomestic && intlNote && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-xs leading-relaxed text-walnut-dark">
                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {intlNote}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white/50 p-6">
            <h2 className="heading-display mb-3 text-lg font-semibold text-ink">Payment</h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setPayment("cod")}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
                  payment === "cod"
                    ? "border-walnut bg-parchment/70"
                    : "border-line bg-white/40 hover:border-walnut/40"
                )}
              >
                <Banknote className="h-5 w-5 shrink-0 text-walnut" />
                <span>
                  <span className="block text-sm font-semibold text-ink">Cash on Delivery</span>
                  <span className="block text-xs text-umber">
                    Keep {format(total)} ready — our rider collects payment at your door.
                  </span>
                </span>
              </button>

              {bank && (
                <button
                  type="button"
                  onClick={() => setPayment("bank")}
                  className={cn(
                    "focus-ring flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
                    payment === "bank"
                      ? "border-walnut bg-parchment/70"
                      : "border-line bg-white/40 hover:border-walnut/40"
                  )}
                >
                  <Landmark className="h-5 w-5 shrink-0 text-walnut" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Online bank transfer
                    </span>
                    <span className="block text-xs text-umber">
                      Transfer {format(total)} to our account — we dispatch once it&rsquo;s
                      confirmed.
                    </span>
                  </span>
                </button>
              )}
            </div>

            {bank && payment === "bank" && (
              <div className="mt-4 space-y-3 rounded-xl border border-line bg-parchment/50 p-4">
                <dl className="space-y-1.5 text-sm">
                  {bank.bankName && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-umber">Bank</dt>
                      <dd className="font-semibold text-ink">{bank.bankName}</dd>
                    </div>
                  )}
                  {bank.accountName && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-umber">Account holder</dt>
                      <dd className="font-semibold text-ink">{bank.accountName}</dd>
                    </div>
                  )}
                  {bank.accountNumber && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-umber">Account number</dt>
                      <dd className="font-semibold break-all text-ink">{bank.accountNumber}</dd>
                    </div>
                  )}
                  {bank.iban && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-umber">IBAN</dt>
                      <dd className="font-semibold break-all text-ink">{bank.iban}</dd>
                    </div>
                  )}
                </dl>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-bark">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" />
                  <span>
                    After placing the order, transfer the total and send us a{" "}
                    <strong>screenshot/photo of the transaction receipt</strong> (make sure the
                    amount, date and reference are clearly visible) plus a{" "}
                    <strong>screenshot of your order</strong>
                    {whatsapp ? (
                      <>
                        {" "}
                        on{" "}
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-walnut underline underline-offset-2"
                        >
                          WhatsApp
                        </a>
                      </>
                    ) : null}
                    {contactEmail ? (
                      <>
                        {" "}
                        or by email to{" "}
                        <a
                          href={`mailto:${contactEmail}`}
                          className="text-walnut underline underline-offset-2"
                        >
                          {contactEmail}
                        </a>
                      </>
                    ) : null}
                    . We dispatch your order as soon as the transfer is confirmed — the details
                    are also in your confirmation email.
                  </span>
                </p>
              </div>
            )}
          </div>

          <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:px-12">
            Place order — {format(total)}
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
                  {format(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-bark">Subtotal</dt>
              <dd className="font-medium">{format(subtotal)}</dd>
            </div>
            {discount && (
              <div className="flex justify-between text-moss">
                <dt>Discount ({discount.code})</dt>
                <dd>−{format(discount.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-bark">Delivery</dt>
              <dd className="font-medium">
                {effectiveShipping === 0 ? "Free" : format(effectiveShipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>{payment === "bank" ? "Total (bank transfer)" : "Total (COD)"}</dt>
              <dd>{format(total)}</dd>
            </div>
          </dl>
          {currency !== "PKR" && (
            <p className="mt-3 text-[0.7rem] leading-relaxed text-umber">
              Prices are converted from Pakistani Rupees (PKR) at an exchange rate we update
              weekly, and may change if the rate moves.
            </p>
          )}
          <ul className="mt-5 space-y-2 text-xs text-umber">
            <li className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              {isDomestic
                ? "Dispatch in 1–3 business days, delivery 2–7 days"
                : "International delivery — typically 7–14 business days"}
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
