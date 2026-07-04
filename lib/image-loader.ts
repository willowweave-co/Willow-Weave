"use client";

/**
 * Global next/image loader. Delegates resizing + format negotiation to the
 * CDN that already hosts the image, so no Vercel image-optimization quota
 * is used and images stay free-tier friendly:
 *  - cdn.shopify.com  → `?width=` param (Shopify CDN resizes, auto-WebP)
 *  - res.cloudinary.com → `f_auto,q_auto,w_` transform segment
 *  - anything else (local/static) → returned untouched
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith("https://cdn.shopify.com")) {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    return url.toString();
  }
  if (src.startsWith("https://res.cloudinary.com")) {
    // .../image/upload/<transforms>/v123/path → inject transforms after /upload/
    const q = quality ?? "auto";
    return src.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_${q},w_${width},c_limit/`
    );
  }
  // Local /public assets are served as-is; the width param satisfies
  // next/image's requirement that loaders consume the width argument.
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
