import type { HeroSlide } from "@/lib/types";
import { THEME_IMAGES } from "@/lib/content-constants";

/**
 * How long each hero slide holds before the next one, in ms. The owner can
 * change this in Admin → Homepage → Hero; this is the value used until they
 * do, and the one the storefront falls back to when migration 0014 has not
 * been applied yet.
 */
export const DEFAULT_HERO_INTERVAL_MS = 6500;

/** Bounds mirrored by the 0014 check constraint and the dashboard control. */
export const MIN_HERO_INTERVAL_MS = 2000;
export const MAX_HERO_INTERVAL_MS = 20000;

/**
 * Seed slides for the homepage hero slideshow — shown until the owner edits
 * them in Admin → Homepage. They mirror what the old static homepage promoted:
 * the featured volume plus the two hero tiles (New Arrivals / Bestsellers).
 */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "seed-featured",
    mediaType: "image",
    mediaUrl: THEME_IMAGES.heroFeatured,
    eyebrow: "Volume 5",
    heading: "Sun Kissed Threads",
    href: "/collections/volume-5-sun-kisses-threads",
    ctaLabel: "Shop Now",
    enabled: true,
  },
  {
    id: "seed-new-arrivals",
    mediaType: "image",
    mediaUrl: THEME_IMAGES.heroNewArrivals,
    eyebrow: "Eid Ul Adha 2026",
    heading: "New Arrivals",
    href: "/collections/eid-ul-adha-2026",
    ctaLabel: "Shop Now",
    enabled: true,
  },
  {
    id: "seed-bestsellers",
    mediaType: "image",
    mediaUrl: THEME_IMAGES.heroBestsellers,
    eyebrow: "Customer favourites",
    heading: "Bestsellers",
    href: "/products",
    ctaLabel: "Shop Now",
    enabled: true,
  },
];
