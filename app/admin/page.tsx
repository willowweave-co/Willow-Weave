import Link from "next/link";
import Image from "next/image";
import { TrendingUp, ShoppingCart, PackageOpen, AlertTriangle } from "lucide-react";
import { repo } from "@/lib/data";
import { formatPKR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { OrderStatusBadge } from "@/components/ui/badge";
import { ORDER_STATUSES } from "@/lib/types";

export default async function AdminOverviewPage() {
  const [stats, orders] = await Promise.all([repo.getStats(), repo.getOrders()]);
  const recent = orders.slice(0, 6);

  const tiles = [
    {
      label: "Revenue today",
      value: formatPKR(stats.revenueToday),
      sub: `${stats.ordersToday} ${stats.ordersToday === 1 ? "order" : "orders"}`,
      icon: TrendingUp,
    },
    {
      label: "Last 7 days",
      value: formatPKR(stats.revenue7d),
      sub: `${stats.orders7d} orders`,
      icon: ShoppingCart,
    },
    {
      label: "Last 30 days",
      value: formatPKR(stats.revenue30d),
      sub: `${stats.orders30d} orders`,
      icon: PackageOpen,
    },
    {
      label: "Awaiting action",
      value: String(stats.pendingOrders),
      sub: "pending orders",
      icon: AlertTriangle,
      href: "/admin/orders?status=pending",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="heading-display text-2xl font-semibold text-ink">Overview</h1>
        <p className="mt-1 text-sm text-umber">How the store is doing at a glance.</p>
      </header>

      {/* stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-umber uppercase">{t.label}</p>
                <t.icon className="h-4 w-4 text-umber/60" />
              </div>
              <p className="heading-display mt-2 text-2xl font-semibold text-ink">{t.value}</p>
              <p className="mt-0.5 text-xs text-umber">{t.sub}</p>
            </>
          );
          return t.href ? (
            <Link
              key={t.label}
              href={t.href as never}
              className="rounded-2xl border border-line bg-white/60 p-5 transition-shadow hover:shadow-md"
            >
              {inner}
            </Link>
          ) : (
            <div key={t.label} className="rounded-2xl border border-line bg-white/60 p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* revenue chart */}
        <section className="rounded-2xl border border-line bg-white/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Revenue — last 30 days</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-walnut hover:underline">
              All orders →
            </Link>
          </div>
          <RevenueChart data={stats.revenueSeries} />
        </section>

        {/* status + top products */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Orders by status</h2>
            <ul className="space-y-2">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link
                    href={`/admin/orders?status=${s}` as never}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-linen"
                  >
                    <OrderStatusBadge status={s} />
                    <span className="text-sm font-semibold text-ink">{stats.byStatus[s] ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Top products (30d)</h2>
            {stats.topProducts.length ? (
              <ul className="space-y-2.5">
                {stats.topProducts.map((p) => (
                  <li key={p.handle} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/products/${p.handle}`}
                      className="line-clamp-1 text-bark hover:text-walnut hover:underline"
                    >
                      {p.title}
                    </Link>
                    <span className="shrink-0 text-xs text-umber">
                      {p.units} sold · {formatPKR(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-umber">No sales yet in the last 30 days.</p>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* recent orders */}
        <section className="rounded-2xl border border-line bg-white/60">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-walnut hover:underline">
              View all →
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}` as never}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-linen/50"
                  >
                    <span className="w-20 shrink-0 text-sm font-semibold text-ink">
                      {o.orderNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-bark">{o.customerName}</span>
                      <span className="block text-xs text-umber">
                        {o.city} · {formatDateTime(o.createdAt)}
                      </span>
                    </span>
                    <OrderStatusBadge status={o.status} />
                    <span className="w-24 shrink-0 text-right text-sm font-semibold text-ink">
                      {formatPKR(o.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-umber">
              No orders yet — they'll appear here the moment a customer checks out.
            </p>
          )}
        </section>

        {/* low stock */}
        <section className="rounded-2xl border border-line bg-white/60">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <AlertTriangle className="h-4 w-4 text-madder" /> Low stock
            </h2>
            <Link href="/admin/inventory" className="text-xs font-medium text-walnut hover:underline">
              Inventory →
            </Link>
          </div>
          {stats.lowStock.length ? (
            <ul className="divide-y divide-line">
              {stats.lowStock.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-sm text-bark">{v.productTitle}</span>
                    <span className="text-xs text-umber">{v.variantLabel}</span>
                  </span>
                  <span
                    className={
                      v.stock === 0
                        ? "shrink-0 rounded-full bg-madder/12 px-2.5 py-0.5 text-xs font-semibold text-madder"
                        : "shrink-0 rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-walnut-dark"
                    }
                  >
                    {v.stock === 0 ? "Out" : `${v.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-umber">
              All variants comfortably stocked.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
