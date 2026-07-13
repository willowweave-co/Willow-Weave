import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataMode } from "@/lib/data";
import { createSupabaseServer } from "@/lib/supabase/server";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public pageview beacon for the storefront (components/store/traffic-beacon.tsx).
 *
 * Writes through the record_page_view() RPC (security definer, granted to anon)
 * rather than the service-role key: this route is unauthenticated, and a
 * service-role client in an unauthenticated path is one logic slip away from
 * full database access. The RPC can only ever append one row to page_views.
 * Reads still go through traffic_snapshot(), which is staff-only.
 */

const payloadSchema = z.object({
  vid: z.string().min(8).max(64),
  path: z.string().startsWith("/").max(300),
  ref: z.string().max(500).optional(),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(120).optional(),
    })
    .optional(),
});

const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|uptime|vercel-screenshot/i;

export async function POST(request: NextRequest) {
  // Local mode has no database — accept and drop so the storefront never errors.
  if (dataMode === "local") return new NextResponse(null, { status: 204 });

  const ua = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });

  // A real visitor fires one of these per navigation. Cap the flood a single
  // source can pour into page_views (free-tier row budget, and skewed stats).
  const limit = rateLimit(`track:${clientIpFrom(request)}`, 60, 60_000);
  if (!limit.ok) return new NextResponse(null, { status: 204 });

  let parsed;
  try {
    parsed = payloadSchema.safeParse(await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!parsed.success || parsed.data.path.startsWith("/admin")) {
    return new NextResponse(null, { status: 204 });
  }

  const { vid, path, ref, utm } = parsed.data;
  try {
    const supabase = await createSupabaseServer();
    await supabase.rpc("record_page_view", {
      p_vid: vid,
      p_path: path,
      p_ref: ref || null,
      p_source: utm?.source || null,
      p_medium: utm?.medium || null,
      p_campaign: utm?.campaign || null,
    });
  } catch {
    // analytics must never break the store — swallow (e.g. migration not run yet)
  }
  return new NextResponse(null, { status: 204 });
}
