"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatPKR } from "@/lib/money";
import { formatDateTime, cn } from "@/lib/utils";
import { Badge, OrderStatusBadge } from "@/components/ui/badge";
import { ORDER_STATUSES, type OrderStatus, type PaymentMethod } from "@/lib/types";

export interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  city: string;
  country: string;
  address: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
}

/** Client-side list: search filters as you type, tabs switch instantly. */
export function OrdersTable({
  orders: all,
  initialStatus,
}: {
  orders: OrderRow[];
  initialStatus?: OrderStatus | null;
}) {
  const [status, setStatus] = useState<OrderStatus | null>(initialStatus ?? null);
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const orders = useMemo(
    () =>
      all.filter((o) => {
        if (status && o.status !== status) return false;
        if (query) {
          const hay =
            `${o.orderNumber} ${o.customerName} ${o.phone} ${o.city} ${o.country} ${o.email ?? ""}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      }),
    [all, status, query]
  );

  const counts = new Map<OrderStatus | "all", number>([["all", all.length]]);
  for (const s of ORDER_STATUSES) counts.set(s, all.filter((o) => o.status === s).length);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* status tabs */}
        <div className="scrollbar-none -mb-1 flex gap-2 overflow-x-auto pb-1">
          {([null, ...ORDER_STATUSES] as (OrderStatus | null)[]).map((s) => {
            const active = status === s;
            return (
              <button
                key={s ?? "all"}
                onClick={() => setStatus(s)}
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
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, order #…"
            className="w-full rounded-full border border-line bg-white/70 py-2 pr-4 pl-9 text-sm focus:border-walnut focus:outline-none"
          />
        </div>
      </div>

      {orders.length ? (
        <>
          {/* phones: card list — a six-column table can't honestly fit 400px */}
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white/60 sm:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}` as never}
                  className="flex items-start justify-between gap-3 px-4 py-3.5 transition-colors active:bg-linen/60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{o.orderNumber}</span>
                    <span className="block truncate text-sm text-bark">{o.customerName}</span>
                    <span className="block truncate text-xs text-umber">
                      {o.city}
                      {o.country !== "Pakistan" && `, ${o.country}`} · {formatDateTime(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-sm font-semibold text-ink">{formatPKR(o.total)}</span>
                    {o.paymentMethod === "bank" && (
                      <span className="text-[0.6rem] font-semibold tracking-wide text-walnut uppercase">
                        Bank transfer
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* sm and up: the full table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white/60 sm:block">
            <table className="w-full min-w-[560px] text-sm md:min-w-[720px]">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
                  <th className="px-4 py-3.5 font-medium sm:px-5">Order</th>
                  <th className="px-4 py-3.5 font-medium">Customer</th>
                  <th className="hidden px-4 py-3.5 font-medium md:table-cell">Delivery</th>
                  <th className="hidden px-4 py-3.5 font-medium md:table-cell">Items</th>
                  <th className="px-4 py-3.5 font-medium">Payment</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 text-right font-medium sm:px-5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="group relative transition-colors hover:bg-linen/50">
                    <td className="px-4 py-3.5 sm:px-5">
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
                      {/* delivery column is hidden on phones — surface the city here */}
                      <p className="text-xs text-umber md:hidden">
                        {o.city}
                        {o.country !== "Pakistan" && `, ${o.country}`}
                      </p>
                    </td>
                    <td className="hidden max-w-52 px-4 py-3.5 md:table-cell">
                      <p className="truncate text-bark">
                        {o.city}
                        {o.country !== "Pakistan" && `, ${o.country}`}
                      </p>
                      <p className="truncate text-xs text-umber">{o.address}</p>
                    </td>
                    <td className="hidden px-4 py-3.5 text-bark md:table-cell">{o.itemCount}</td>
                    <td className="px-4 py-3.5">
                      {o.paymentMethod === "bank" ? (
                        <Badge tone="warning">Bank</Badge>
                      ) : (
                        <Badge tone="neutral">COD</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink sm:px-5">
                      {formatPKR(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-white/60 py-16 text-center">
          <p className="text-bark">
            {all.length === 0
              ? "No orders yet — the first checkout will land here."
              : "No orders match this filter."}
          </p>
        </div>
      )}
    </>
  );
}
