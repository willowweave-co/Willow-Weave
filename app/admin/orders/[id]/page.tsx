import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, StickyNote, Printer } from "lucide-react";
import { repo } from "@/lib/data";
import { formatPKR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";
import {
  OrderStatusControls,
  OrderNotesForm,
  DeleteOrderButton,
} from "@/components/admin/order-controls";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Order detail" };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await repo.getOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/orders"
        className="no-print mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display flex items-center gap-3 text-2xl font-semibold text-ink">
            {order.orderNumber} <OrderStatusBadge status={order.status} />
          </h1>
          <p className="mt-1 text-sm text-umber">
            Placed {formatDateTime(order.createdAt)} · Cash on Delivery
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}/packing-slip` as never}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-bark transition-colors hover:border-walnut hover:text-walnut"
          >
            <Printer className="h-4 w-4" /> Packing slip
          </Link>
          <DeleteOrderButton orderId={order.id} orderNumber={order.orderNumber} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* items */}
          <section className="rounded-2xl border border-line bg-white/60">
            <h2 className="border-b border-line px-5 py-4 font-semibold text-ink">
              Items ({order.items.reduce((n, i) => n + i.quantity, 0)})
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      width={56}
                      height={70}
                      className="h-[4.4rem] w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="block h-[4.4rem] w-14 rounded-lg bg-parchment" />
                  )}
                  <div className="min-w-0 flex-1">
                    {item.handle ? (
                      <Link
                        href={`/products/${item.handle}`}
                        className="line-clamp-1 font-medium text-ink hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="line-clamp-1 font-medium text-ink">{item.title}</p>
                    )}
                    <p className="text-xs text-umber">
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="hidden text-sm text-bark sm:block">
                    {formatPKR(item.unitPrice)} × {item.quantity}
                  </p>
                  <p className="w-20 shrink-0 text-right font-semibold text-ink sm:w-24">
                    <span className="block text-xs font-normal text-umber sm:hidden">
                      × {item.quantity}
                    </span>
                    {formatPKR(item.unitPrice * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
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
              <div className="flex justify-between pt-1.5 text-base font-semibold text-ink">
                <dt>Total to collect (COD)</dt>
                <dd>{formatPKR(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* internal notes */}
          <section className="no-print rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <StickyNote className="h-4 w-4 text-umber" /> Internal notes
            </h2>
            <OrderNotesForm orderId={order.id} initialNotes={order.internalNotes ?? ""} />
          </section>
        </div>

        <div className="space-y-6">
          {/* status */}
          <section className="no-print rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Status</h2>
            <OrderStatusControls orderId={order.id} current={order.status} />
            <ol className="mt-4 space-y-2 border-t border-line pt-4">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-bark">{h.status}</span>
                  <span className="text-umber">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* customer */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Customer & delivery</h2>
            <p className="font-medium text-ink">{order.customerName}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-bark">
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-umber" />
                <a href={`tel:${order.phone}`} className="hover:text-walnut hover:underline">
                  {order.phone}
                </a>
              </li>
              {order.email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-umber" />
                  <a
                    href={`mailto:${order.email}`}
                    className="break-all hover:text-walnut hover:underline"
                  >
                    {order.email}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-umber" />
                <span>
                  {order.address}
                  <br />
                  <strong>{order.city}</strong>
                </span>
              </li>
            </ul>
            {order.notes && (
              <p className="mt-4 rounded-xl bg-parchment/70 px-3.5 py-2.5 text-xs leading-relaxed text-bark">
                <strong>Customer note:</strong> {order.notes}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
