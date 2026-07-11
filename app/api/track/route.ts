import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataMode } from "@/lib/data";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public pageview beacon for the storefront (components/store/traffic-beacon.tsx).
 * Writes to page_views with the service-role client — the table has RLS with no
 * policies, so the anon key can't read or spoof it directly. Powers the
 * Admin → Overview "Live traffic" section.
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
  if (dataMode === "local" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });

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
    const admin = createSupabaseAdmin();
    await admin.from("page_views").insert({
      visitor_id: vid,
      path,
      referrer: ref || null,
      utm_source: utm?.source || null,
      utm_medium: utm?.medium || null,
      utm_campaign: utm?.campaign || null,
    });
  } catch {
    // analytics must never break the store — swallow (e.g. migration not run yet)
  }
  return new NextResponse(null, { status: 204 });
}
