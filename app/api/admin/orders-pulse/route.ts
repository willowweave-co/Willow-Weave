import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { repo, dataMode } from "@/lib/data";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight heartbeat for the dashboard's live order watcher:
 * total order count + newest order number. Staff only.
 */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (dataMode === "supabase") {
    const supabase = await createSupabaseServer();
    const [{ count }, { data: latest }] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("order_number")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return NextResponse.json({
      count: count ?? 0,
      latestNumber: latest?.order_number ?? null,
    });
  }

  const orders = await repo.getOrders();
  return NextResponse.json({
    count: orders.length,
    latestNumber: orders[0]?.orderNumber ?? null,
  });
}
