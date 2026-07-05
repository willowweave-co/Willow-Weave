/**
 * Pure constants — safe to import from BOTH server and client components.
 * (lib/content.ts reads from node:fs and must stay server-only.)
 */

/** Homepage curation — mirrors the live Shopify homepage exactly. */
export const HOME = {
  heroCollectionHandle: "eid-ul-adha-2026", // "New Arrivals" banner target
  bestsellersHref: "/products", // "Bestsellers" banner target (was /collections/all)
  featuredCollectionHandle: "volume-5-sun-kisses-threads", // "Sun Kissed Threads" slideshow
  trendingHandles: [
    "tea-pink-embroidered-3-piece-set",
    "royal-blue-2-piece-suit-with-embroidered-kurta-trousers",
    "tobacco-brown-3-piece-suit-with-embroidered-kurta-straight-pants-and-dupatta",
    "3-piece-suit-prussian-blue-cotton-kurta-set-with-tie-dye-dupatta",
    "mustard-vintage-floral-print-kurta-set",
  ],
} as const;

/**
 * Curated theme images in public/theme/ — optimized with sharp from the
 * originals archived in data/images/theme/ (kept out of git for size).
 */
export const THEME_IMAGES = {
  logo: "/theme/logo-opt.png",
  heroNewArrivals: "/theme/hero-new-arrivals.jpg",
  heroBestsellers: "/theme/hero-bestsellers.jpg",
  heroFeatured: "/theme/hero-featured.jpg",
  sizeCharts: "/theme/size-charts.png",
} as const;

export const POLICY_SLUGS = [
  "privacy-policy",
  "refund-policy",
  "terms-of-service",
  "shipping-policy",
] as const;
