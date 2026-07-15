import { repo } from "@/lib/data";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const all = await repo.getOrders();

  // deep links like /admin/orders?status=pending (dashboard cards) still work
  const initialStatus = ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : null;

  const rows: OrderRow[] = all.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    phone: o.phone,
    email: o.email,
    city: o.city,
    country: o.country,
    paymentMethod: o.paymentMethod,
    address: o.address,
    status: o.status,
    total: o.total,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    createdAt: o.createdAt,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="heading-display text-2xl font-semibold text-ink">Orders</h1>
        <p className="mt-1 text-sm text-umber">
          Track every order — payment method, contact details, delivery address and status in one
          place.
        </p>
      </header>

      <OrdersTable orders={rows} initialStatus={initialStatus} />
    </div>
  );
}
