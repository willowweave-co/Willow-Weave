import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm"]);

/**
 * `file.type` is whatever the client claimed. Confirm the bytes actually are
 * what the MIME says before we store or forward them — a file labelled
 * image/png whose contents are HTML/SVG is the classic stored-XSS vector.
 */
function sniff(buf: Buffer): "image" | "video" | null {
  const ascii = (start: number, text: string) =>
    buf.length >= start + text.length &&
    buf.subarray(start, start + text.length).toString("latin1") === text;
  const bytes = (...sig: number[]) =>
    buf.length >= sig.length && sig.every((b, i) => buf[i] === b);

  if (bytes(0xff, 0xd8, 0xff)) return "image"; // JPEG
  if (bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image"; // PNG
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "image"; // GIF
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image"; // WebP
  if (ascii(4, "ftyp")) {
    // ISO-BMFF: AVIF/HEIC are images, everything else here (mp4/M4V) is video
    const brand = buf.subarray(8, 12).toString("latin1");
    return brand === "avif" || brand === "avis" ? "image" : "video";
  }
  if (bytes(0x1a, 0x45, 0xdf, 0xa3)) return "video"; // Matroska/WebM
  return null;
}

/**
 * Product image / hero media upload.
 *  - Cloudinary configured → uploads to willow-weave/uploads, returns CDN URL
 *  - Local mode fallback   → saves under public/uploads (dev preview only)
 * Videos (MP4/WebM, for hero campaign slides) are accepted alongside images;
 * the response carries kind: "image" | "video" so callers can tag the media.
 */
export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const isVideo = ALLOWED_VIDEO.has(file.type);
  if (!isVideo && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG/PNG/WebP/AVIF/GIF images or MP4/WebM videos are allowed" },
      { status: 400 }
    );
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Video too large (max 40 MB)" }, { status: 400 });
  }
  if (!isVideo && file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // the claimed MIME must match what the bytes actually are
  const sniffed = sniff(buffer);
  if (sniffed === null || sniffed !== (isVideo ? "video" : "image")) {
    return NextResponse.json(
      { error: "That file isn't a real image or video (its contents don't match its type)." },
      { status: 400 }
    );
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    try {
      const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              isVideo
                ? { folder: "willow-weave/uploads", resource_type: "video" }
                : {
                    folder: "willow-weave/uploads",
                    resource_type: "image",
                    // Incoming transformation: re-encode the stored original so huge
                    // phone photos don't pile up. Delivery still applies f_auto,q_auto
                    // per-size via lib/image-loader.ts.
                    transformation: [
                      { width: 2000, height: 2000, crop: "limit", quality: "auto:good" },
                    ],
                  },
              (err, result) => (err || !result ? reject(err) : resolve(result))
            )
            .end(buffer);
        }
      );
      return NextResponse.json({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        kind: isVideo ? "video" : "image",
      });
    } catch (e) {
      console.error("Cloudinary upload failed:", e);
      return NextResponse.json({ error: "Cloudinary upload failed" }, { status: 502 });
    }
  }

  if (user.localMode) {
    const ext =
      file.type === "video/mp4" ? "mp4"
      : file.type === "video/webm" ? "webm"
      : file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : file.type === "image/gif" ? "gif"
      : "jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer);
    return NextResponse.json({ url: `/uploads/${name}`, kind: isVideo ? "video" : "image" });
  }

  return NextResponse.json(
    { error: "Cloudinary is not configured — add the keys from .env.example" },
    { status: 400 }
  );
}
