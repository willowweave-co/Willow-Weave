import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

/**
 * Social-share (og:image) version of a Cloudinary URL: capped at 1200px and
 * auto-compressed, but kept as JPEG since some scrapers (WhatsApp, older
 * Facebook) don't handle WebP/AVIF. Non-Cloudinary URLs pass through as-is.
 */
export function ogImage(src: string): string {
  if (!src.startsWith("https://res.cloudinary.com")) return src;
  return src.replace("/image/upload/", "/image/upload/w_1200,c_limit,q_auto:good/");
}

/** yyyy-mm-dd in local time (Karachi for the store; server TZ in practice). */
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
