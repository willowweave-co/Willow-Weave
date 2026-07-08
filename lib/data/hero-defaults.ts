import type { HeroSlide } from "@/lib/types";
import { THEME_IMAGES } from "@/lib/content-constants";

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
