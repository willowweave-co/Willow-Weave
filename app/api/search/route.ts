import { NextRequest, NextResponse } from "next/server";
import { searchSite } from "@/lib/search-server";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  // Search fans out over the whole catalog; it's the most expensive public GET.
  // Generous for type-ahead (the UI debounces), tight enough to not be a lever.
  const limit = rateLimit(`search:${clientIpFrom(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { results: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const results = await searchSite(q, 12);
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } }
  );
}
