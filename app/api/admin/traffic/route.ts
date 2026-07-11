import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { dataMode } from "@/lib/data";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Aggregated traffic snapshot for the dashboard's Live traffic section.
 * One RPC to traffic_snapshot() (supabase/migrations/0004_traffic.sql).
 * Staff only.
 */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (dataMode === "local") {
    return NextResponse.json({ mode: "local" });
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("traffic_snapshot");
  if (error) {
    // most likely migration 0004 hasn't been pasted into the SQL editor yet
    return NextResponse.json({ pending: true, message: error.message });
  }
  return NextResponse.json(data);
}
