import { promises as fs } from "node:fs";
import path from "node:path";

/** Shape of data/content.json produced by scripts/extract-content.mjs */
export interface SiteContent {
  pages: {
    about: { title: string; bodyHtml: string };
    philosophy: { title: string; bodyHtml: string };
  };
  policies: Record<string, { title: string; bodyHtml: string }>;
  home: {
    heroHeadings: { newArrivals: string; bestsellers: string; featured: string; trending: string };
    sizeChartSection: { heading: string; bodyHtml: string };
  };
  socials: { facebook?: string; instagram?: string; tiktok?: string };
  accordions: Record<string, { label: string; bodyHtml: string }>;
  themeAssets: Record<string, { url: string; local: string }>;
}

let _content: Promise<SiteContent> | null = null;

export function getContent(): Promise<SiteContent> {
  _content ??= fs
    .readFile(path.join(process.cwd(), "data", "content.json"), "utf8")
    .then((s) => JSON.parse(s) as SiteContent);
  return _content;
}

// Constants (HOME, THEME_IMAGES, POLICY_SLUGS) live in lib/content-constants.ts
// so client components can import them without dragging node:fs into the bundle.
export { HOME, THEME_IMAGES, POLICY_SLUGS } from "./content-constants";
