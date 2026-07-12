import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export interface MediaItem {
  /** Cloudinary public_id, or the /uploads/… path in local mode */
  id: string;
  url: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string | null;
  filename: string;
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);
const VIDEO_EXT = new Set(["mp4", "webm"]);

function cloudinaryConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function getCloudinary() {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/** Local-mode fallback: list whatever `/api/admin/upload` saved under public/uploads. */
async function listLocal(kind: string, q: string): Promise<MediaItem[]> {
  const dir = path.join(process.cwd(), "public", "uploads");
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const items: MediaItem[] = [];
  for (const name of names) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const fileKind = IMAGE_EXT.has(ext) ? "image" : VIDEO_EXT.has(ext) ? "video" : null;
    if (!fileKind) continue;
    if (kind === "image" && fileKind !== "image") continue;
    if (q && !name.toLowerCase().includes(q.toLowerCase())) continue;
    const stat = await fs.stat(path.join(dir, name));
    items.push({
      id: `/uploads/${name}`,
      url: `/uploads/${name}`,
      kind: fileKind,
      width: null,
      height: null,
      bytes: stat.size,
      createdAt: stat.mtime.toISOString(),
      filename: name,
    });
  }
  return items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/**
 * GET /api/admin/media?kind=image&q=…&cursor=…
 * Lists everything under the willow-weave/ Cloudinary folder (products,
 * theme, uploads), newest first, 60 per page via next_cursor pagination.
 */
export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const kind = params.get("kind") === "image" ? "image" : "all";
  // Cloudinary's search expression is Lucene-ish; keep the query alphanumeric.
  const q = (params.get("q") ?? "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  const cursor = params.get("cursor") ?? null;

  if (!cloudinaryConfigured()) {
    if (!user.localMode) {
      return NextResponse.json(
        { error: "Cloudinary is not configured — add the keys from .env.example" },
        { status: 400 }
      );
    }
    return NextResponse.json({ items: await listLocal(kind, q), nextCursor: null });
  }

  try {
    const cloudinary = await getCloudinary();
    // public_id (not folder:) — the migration script uploaded with explicit
    // public_ids, which don't populate the search index's folder field.
    const expression =
      "public_id:willow-weave/*" +
      (kind === "image"
        ? " AND resource_type:image"
        : " AND (resource_type:image OR resource_type:video)");

    type CloudinaryResource = {
      public_id: string;
      secure_url: string;
      resource_type: string;
      width?: number;
      height?: number;
      bytes?: number;
      created_at?: string;
      filename?: string;
      format?: string;
    };
    const toItem = (r: CloudinaryResource): MediaItem => ({
      id: r.public_id,
      url: r.secure_url,
      kind: r.resource_type === "video" ? "video" : "image",
      width: r.width ?? null,
      height: r.height ?? null,
      bytes: r.bytes ?? null,
      createdAt: r.created_at ?? null,
      filename:
        (r.filename ?? r.public_id.split("/").pop() ?? r.public_id) +
        (r.format ? `.${r.format}` : ""),
    });
    const runSearch = async (maxResults: number, nextCursor: string | null) => {
      let search = cloudinary.search
        .expression(expression)
        .sort_by("created_at", "desc")
        .max_results(maxResults);
      if (nextCursor) search = search.next_cursor(nextCursor);
      return (await search.execute()) as {
        resources?: CloudinaryResource[];
        next_cursor?: string;
      };
    };

    if (q) {
      // Cloudinary search can't do substring matches (no leading wildcards),
      // so sweep the willow-weave folder and filter on public_id ourselves.
      // Folder names are slugified, so "tea pink" should match "tea-pink".
      const needle = q.toLowerCase().replace(/\s+/g, "-");
      const matches: MediaItem[] = [];
      let sweepCursor: string | null = null;
      for (let page = 0; page < 10; page++) {
        const result = await runSearch(100, sweepCursor);
        for (const r of result.resources ?? []) {
          if (r.public_id.toLowerCase().includes(needle)) matches.push(toItem(r));
        }
        sweepCursor = result.next_cursor ?? null;
        if (!sweepCursor) break;
      }
      return NextResponse.json({ items: matches, nextCursor: null });
    }

    const result = await runSearch(60, cursor);
    return NextResponse.json({
      items: (result.resources ?? []).map(toItem),
      nextCursor: result.next_cursor ?? null,
    });
  } catch (e) {
    console.error("Cloudinary media list failed:", e);
    return NextResponse.json({ error: "Couldn't load the media library" }, { status: 502 });
  }
}

/**
 * DELETE /api/admin/media  { id, kind }
 * Permanently removes an asset (Cloudinary destroy, or unlink in local mode).
 */
export async function DELETE(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let id = "";
  let kind = "image";
  try {
    const body = await request.json();
    id = typeof body.id === "string" ? body.id : "";
    kind = body.kind === "video" ? "video" : "image";
  } catch {
    /* fall through to the guard below */
  }

  if (id.startsWith("/uploads/")) {
    if (!user.localMode) {
      return NextResponse.json({ error: "Not a Cloudinary asset" }, { status: 400 });
    }
    const name = path.basename(id);
    try {
      await fs.unlink(path.join(process.cwd(), "public", "uploads", name));
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // Only assets in our own folder — never allow arbitrary public_ids.
  if (!id.startsWith("willow-weave/")) {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }
  if (!cloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 400 });
  }

  try {
    const cloudinary = await getCloudinary();
    const result = await cloudinary.uploader.destroy(id, {
      resource_type: kind,
      invalidate: true,
    });
    if (result.result !== "ok") {
      return NextResponse.json({ error: `Delete failed (${result.result})` }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Cloudinary delete failed:", e);
    return NextResponse.json({ error: "Couldn't delete the asset" }, { status: 502 });
  }
}
