import Link from "next/link";
import { TrendingUp, ShoppingCart, PackageOpen, AlertTriangle } from "lucide-react";
import { repo } from "@/lib/data";
import { formatPKR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { TrafficMonitor } from "@/components/admin/traffic-monitor";
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-umber uppercase">{t.label}</p>
                <t.icon className="h-4 w-4 text-umber/60" />
              </div>
              <p className="heading-display mt-2 text-xl font-semibold text-ink sm:text-2xl">{t.value}</p>
              <p className="mt-0.5 text-xs text-umber">{t.sub}</p>
            </>
          );
          return t.href ? (
            <Link
              key={t.label}
              href={t.href as never}
              className="rounded-2xl border border-line bg-white/60 p-4 transition-shadow hover:shadow-md sm:p-5"
            >
              {inner}
            </Link>
          ) : (
            <div key={t.label} className="rounded-2xl border border-line bg-white/60 p-4 sm:p-5">
              {inner}
            </div>
          );
        })}
      </div>

      {/* live traffic — visitors right now, 24h trend, ad-campaign sources */}
      <TrafficMonitor />

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* revenue chart */}
        <section className="flex flex-col rounded-2xl border border-line bg-white/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="font-semibold text-ink">Revenue — last 30 days</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-walnut hover:underline">
              All orders →
            </Link>
          </div>
          <RevenueChart data={stats.revenueSeries} />
        </section>

        {/* status + top products */}
        <div className="space-y-4 sm:space-y-6">
          <section className="rounded-2xl border border-line bg-white/60 p-4 sm:p-5">
            <h2 className="mb-2 font-semibold text-ink sm:mb-3">Orders by status</h2>
            <ul className="space-y-1 sm:space-y-2">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link
                    href={`/admin/orders?status=${s}` as never}
                    className="flex items-center justify-between rounded-lg px-2 py-1 transition-colors hover:bg-linen sm:py-1.5"
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

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* recent orders */}
        <section className="rounded-2xl border border-line bg-white/60">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-4">
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
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-linen/50 sm:gap-4 sm:px-5 sm:py-3.5"
                  >
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {o.orderNumber}
                    </span>
                    <span className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
                      <span className="block truncate text-sm text-bark">{o.customerName}</span>
                      <span className="block truncate text-xs text-umber">
                        {o.city} · {formatDateTime(o.createdAt)}
                      </span>
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
                      <OrderStatusBadge status={o.status} />
                      <span className="text-right text-sm font-semibold text-ink">
                        {formatPKR(o.total)}
                      </span>
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
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-4">
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
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
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
