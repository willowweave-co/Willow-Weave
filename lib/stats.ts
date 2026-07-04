import type { Order, OrderStatus, Product, SalesStats } from "@/lib/types";
import { dateKey } from "@/lib/utils";

const REVENUE_STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];

/** Shared by both data adapters so dashboard numbers always agree. */
export function computeStats(orders: Order[], products: Product[]): SalesStats {
  const now = new Date();
  const dayMs = 86_400_000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start7 = startToday - 6 * dayMs;
  const start30 = startToday - 29 * dayMs;

  const byStatus: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  let revenueToday = 0,
    revenue7d = 0,
    revenue30d = 0,
    ordersToday = 0,
    orders7d = 0,
    orders30d = 0;

  const series = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    series.set(dateKey(new Date(startToday - i * dayMs)), { revenue: 0, orders: 0 });
  }

  const productAgg = new Map<string, { title: string; handle: string; units: number; revenue: number }>();

  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (!REVENUE_STATUSES.includes(o.status)) continue;
    const t = new Date(o.createdAt).getTime();
    if (t >= startToday) { revenueToday += o.total; ordersToday++; }
    if (t >= start7) { revenue7d += o.total; orders7d++; }
    if (t >= start30) {
      revenue30d += o.total;
      orders30d++;
      const key = dateKey(new Date(o.createdAt));
      const bucket = series.get(key);
      if (bucket) { bucket.revenue += o.total; bucket.orders++; }
      for (const item of o.items) {
        const agg = productAgg.get(item.handle) ?? { title: item.title, handle: item.handle, units: 0, revenue: 0 };
        agg.units += item.quantity;
        agg.revenue += item.unitPrice * item.quantity;
        productAgg.set(item.handle, agg);
      }
    }
  }

  const lowStock = products
    .filter((p) => p.publishedAt)
    .flatMap((p) =>
      p.variants
        .filter((v) => v.stock <= 3)
        .map((v) => ({
          productTitle: p.title,
          handle: p.handle,
          variantLabel: [v.color, v.size].filter(Boolean).join(" / ") || v.title,
          stock: v.stock,
        }))
    )
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 12);

  return {
    revenueToday,
    revenue7d,
    revenue30d,
    ordersToday,
    orders7d,
    orders30d,
    pendingOrders: byStatus.pending,
    byStatus,
    revenueSeries: [...series.entries()].map(([date, v]) => ({ date, ...v })),
    topProducts: [...productAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    lowStock,
  };
}
