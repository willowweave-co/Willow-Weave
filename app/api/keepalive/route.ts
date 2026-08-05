import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Hit daily by a Vercel cron (vercel.json) so the free Supabase project never
 * pauses from 7-day inactivity. Requires the CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, mode: "local", note: "no database to keep alive" });
  }
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("store_settings").select("id").limit(1);
    if (error) throw error;
    // housekeeping: traffic rows older than 90 days (best-effort — table may
    // not exist until migration 0004 is applied)
    const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
    await admin.from("page_views").delete().lt("created_at", cutoff);
    // spent/expired 2FA challenges (migration 0013) — they hold encrypted
    // session material, so don't let dead rows linger
    await admin.rpc("purge_expired_login_challenges");
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (e) {
    console.error("keepalive failed:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
