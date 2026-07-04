import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { CheckCircle2, Banknote, PhoneCall } from "lucide-react";
import type { PlacedOrderDetails } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/money";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

interface Props {
  params: Promise<{ number: string }>;
}

export default async function OrderConfirmedPage({ params }: Props) {
  const { number } = await params;
  const orderNumber = decodeURIComponent(number);

  // Details come from the short-lived cookie set at checkout — there is no
  // public order-lookup endpoint (order numbers must not leak addresses).
  const cookieStore = await cookies();
  let order: PlacedOrderDetails | null = null;
  try {
    const raw = cookieStore.get("ww-last-order")?.value;
    if (raw) {
      const parsed = JSON.parse(raw) as PlacedOrderDetails;
      if (parsed.orderNumber === orderNumber) order = parsed;
    }
  } catch {
    order = null;
  }

  return (
    <div className="container-site flex flex-col items-center py-14 md:py-20">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-moss/12">
        <CheckCircle2 className="h-10 w-10 text-moss" />
      </span>
      <h1 className="heading-display mt-5 text-center text-3xl font-semibold text-ink">
        Shukriya! Your order is confirmed
      </h1>
      <p className="mt-2 text-center text-sm text-umber">
        Order <strong className="text-ink">{orderNumber}</strong>
        {order ? <> · placed {new Date(order.createdAt).toLocaleString("en-GB")}</> : null}
      </p>

      {order ? (
        <div className="mt-8 w-full max-w-lg rounded-2xl border border-line bg-white/60 p-6">
          <ul className="space-y-3.5">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                {item.image && (
                  <Image
                    src={item.image}
                    alt=""
                    width={48}
                    height={60}
                    className="h-15 w-12 rounded-lg object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-medium text-ink">{item.title}</span>
                  <span className="text-xs text-umber">
                    {[item.color, item.size].filter(Boolean).join(" · ")} × {item.quantity}
                  </span>
                </span>
                <span className="text-sm font-medium">{formatPKR(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-bark">Subtotal</dt>
              <dd>{formatPKR(order.subtotal)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-moss">
                <dt>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                <dd>−{formatPKR(order.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-bark">Delivery</dt>
              <dd>{order.shippingFee > 0 ? formatPKR(order.shippingFee) : "Free"}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2.5 text-base font-semibold">
              <dt>Total — Cash on Delivery</dt>
              <dd>{formatPKR(order.total)}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-xl bg-parchment/70 px-4 py-3 text-sm leading-relaxed text-bark">
            <p className="flex items-start gap-2">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-walnut" />
              <span>
                Keep <strong>{formatPKR(order.total)}</strong> ready. Delivering to{" "}
                <strong>
                  {order.address}, {order.city}
                </strong>{" "}
                — we may call {order.phone} to confirm.
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-umber">
          Your order has been received and is being prepared. We’ll be in touch on the phone
          number you provided to confirm delivery details.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button href="/products" size="lg">
          Continue shopping
        </Button>
        <Button href="/contact" variant="outline" size="lg">
          <PhoneCall className="h-4 w-4" /> Contact us
        </Button>
      </div>
      <p className="mt-5 text-center text-xs text-umber">
        Orders are processed within 1–3 business days. Delivery takes 2–5 days in cities, 5–7 in
        remote areas.
      </p>
    </div>
  );
}
