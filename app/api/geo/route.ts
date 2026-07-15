import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Which country is this visitor browsing from? Vercel geolocates by IP and
 * passes the ISO code as a request header — no external service involved.
 * Used once per browser to pick a default display currency; the visitor's
 * own choice (footer switcher) always wins afterwards.
 */
export function GET(request: NextRequest) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    // local dev has no geo headers — assume the home market
    "PK";
  return NextResponse.json({ country });
}
