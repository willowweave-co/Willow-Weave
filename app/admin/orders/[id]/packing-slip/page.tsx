import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { repo } from "@/lib/data";
import { formatPKR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/admin/print-button";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Packing slip" };

export default async function PackingSlipPage({ params }: Props) {
  const { id } = await params;
  const [order, settings] = await Promise.all([repo.getOrder(id), repo.getSettings()]);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link
          href={`/admin/orders/${order.id}` as never}
          className="inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
        >
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>
        <PrintButton />
      </div>

      {/* the printable slip */}
      <div className="rounded-2xl border border-line bg-white p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <h1 className="heading-display text-xl font-semibold text-ink">
              {settings.storeName}
            </h1>
            <p className="mt-0.5 text-xs text-umber">willowweave.co · {settings.contact.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-ink">{order.orderNumber}</p>
            <p className="text-xs text-umber">{formatDate(order.createdAt)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 border-b border-line py-5">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-umber uppercase">
              Deliver to
            </p>
            <p className="mt-1.5 font-semibold text-ink">{order.customerName}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-bark">
              {order.address}
              <br />
              {order.city}
              {order.country !== "Pakistan" && (
                <>
                  <br />
                  <strong className="uppercase">{order.country}</strong>
                </>
              )}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">📞 {order.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-umber uppercase">
              Payment
            </p>
            <p className="mt-1.5 text-sm font-semibold text-ink">
              {order.paymentMethod === "bank"
                ? "PREPAID — BANK TRANSFER (verify receipt before dispatch)"
                : "CASH ON DELIVERY"}
            </p>
            <p className="mt-2 inline-block rounded-lg border-2 border-ink px-4 py-2 text-lg font-bold text-ink">
              {order.paymentMethod === "bank" ? "PAID" : "Collect"} {formatPKR(order.total)}
            </p>
            {order.currency !== "PKR" && order.displayTotal != null && (
              <p className="mt-1 text-sm font-semibold text-bark">
                = {order.currency}{" "}
                {order.displayTotal.toLocaleString("en", { maximumFractionDigits: 2 })}{" "}
                <span className="font-normal text-umber">(customer&rsquo;s currency)</span>
              </p>
            )}
          </div>
        </section>

        <table className="w-full py-2 text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.65rem] tracking-[0.12em] text-umber uppercase">
              <th className="py-2.5 font-semibold">Item</th>
              <th className="py-2.5 font-semibold">Variant</th>
              <th className="py-2.5 text-center font-semibold">Qty</th>
              <th className="py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-3 font-medium text-ink">{item.title}</td>
                <td className="py-3 pr-3 text-bark">
                  {[item.color, item.size].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="py-3 text-center text-bark">{item.quantity}</td>
                <td className="py-3 text-right text-bark">
                  {formatPKR(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto w-56 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-bark">Subtotal</dt>
            <dd>{formatPKR(order.subtotal)}</dd>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <dt className="text-bark">Discount</dt>
              <dd>−{formatPKR(order.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-bark">Delivery</dt>
            <dd>{order.shippingFee > 0 ? formatPKR(order.shippingFee) : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 text-base font-bold text-ink">
            <dt>{order.paymentMethod === "bank" ? "Total (paid)" : "Total (COD)"}</dt>
            <dd>{formatPKR(order.total)}</dd>
          </div>
          {order.currency !== "PKR" && order.displayTotal != null && (
            <div className="flex justify-between text-sm text-bark">
              <dt>In {order.currency}</dt>
              <dd>
                {order.currency}{" "}
                {order.displayTotal.toLocaleString("en", { maximumFractionDigits: 2 })}
              </dd>
            </div>
          )}
        </dl>

        {order.notes && (
          <p className="mt-5 rounded-lg border border-line bg-parchment/50 px-4 py-3 text-xs text-bark print:bg-white">
            <strong>Customer note:</strong> {order.notes}
          </p>
        )}

        <p className="mt-6 border-t border-line pt-4 text-center text-xs text-umber">
          Thank you for shopping with {settings.storeName} — where every thread tells a story 🌿
        </p>
      </div>
    </div>
  );
}
