import Link from "next/link";
import { Search } from "lucide-react";
import { repo } from "@/lib/data";
import { formatPKR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, q } = await searchParams;
  const all = await repo.getOrders();

  const activeStatus = ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : null;
  const query = q?.trim().toLowerCase() ?? "";

  const orders = all.filter((o) => {
    if (activeStatus && o.status !== activeStatus) return false;
    if (query) {
      const hay =
        `${o.orderNumber} ${o.customerName} ${o.phone} ${o.city} ${o.email ?? ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const counts = new Map<OrderStatus | "all", number>([["all", all.length]]);
  for (const s of ORDER_STATUSES) counts.set(s, all.filter((o) => o.status === s).length);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-umber">
            Track every COD order — contact details, delivery address and status in one place.
          </p>
        </div>
        <form action="/admin/orders" className="relative">
          {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, phone, order #…"
            className="w-64 rounded-full border border-line bg-white/70 py-2 pr-4 pl-9 text-sm focus:border-walnut focus:outline-none"
          />
        </form>
      </header>

      {/* status tabs */}
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto pb-1">
        {([null, ...ORDER_STATUSES] as (OrderStatus | null)[]).map((s) => {
          const href = s
            ? `/admin/orders?status=${s}${query ? `&q=${encodeURIComponent(q!)}` : ""}`
            : `/admin/orders${query ? `?q=${encodeURIComponent(q!)}` : ""}`;
          const active = activeStatus === s;
          return (
            <Link
              key={s ?? "all"}
              href={href as never}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm capitalize transition-colors",
                active
                  ? "border-walnut bg-walnut text-ivory"
                  : "border-line bg-white/60 text-bark hover:border-walnut/50"
              )}
            >
              {s ?? "All"}{" "}
              <span className={cn("text-xs", active ? "text-ivory/80" : "text-umber")}>
                {counts.get(s ?? "all") ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {orders.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white/60">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
                <th className="px-5 py-3.5 font-medium">Order</th>
                <th className="px-4 py-3.5 font-medium">Customer</th>
                <th className="px-4 py-3.5 font-medium">Delivery</th>
                <th className="px-4 py-3.5 font-medium">Items</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="group relative transition-colors hover:bg-linen/50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/orders/${o.id}` as never}
                      className="font-semibold text-ink after:absolute after:inset-0"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-umber">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-bark">{o.customerName}</p>
                    <p className="text-xs text-umber">{o.phone}</p>
                  </td>
                  <td className="max-w-52 px-4 py-3.5">
                    <p className="truncate text-bark">{o.city}</p>
                    <p className="truncate text-xs text-umber">{o.address}</p>
                  </td>
                  <td className="px-4 py-3.5 text-bark">
                    {o.items.reduce((n, i) => n + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3.5">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-ink">
                    {formatPKR(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white/60 py-16 text-center">
          <p className="text-bark">
            {all.length === 0
              ? "No orders yet — the first checkout will land here."
              : "No orders match this filter."}
          </p>
        </div>
      )}
    </div>
  );
}
