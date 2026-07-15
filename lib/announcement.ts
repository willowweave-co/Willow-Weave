/**
 * Announcement-bar colour helpers — client-safe.
 * Default is an earthy moss green (the site's own green token) that sits
 * naturally with the ivory/walnut palette.
 */
export const DEFAULT_ANNOUNCEMENT_COLOR = "#5f6b4f";

/** Readable text colour (ivory vs ink) for an arbitrary hex background. */
export function announcementTextColor(bg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return "#faf6ef";
  const n = parseInt(m[1], 16);
  // perceived brightness (YIQ)
  const yiq =
    (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return yiq >= 150 ? "#29211a" : "#faf6ef";
}
