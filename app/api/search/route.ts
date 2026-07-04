import { NextRequest, NextResponse } from "next/server";
import { searchSite } from "@/lib/search-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const results = await searchSite(q, 12);
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } }
  );
}
