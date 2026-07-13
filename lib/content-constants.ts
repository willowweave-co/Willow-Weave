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
 * Curated theme images. Heroes live on Cloudinary (uploaded from the
 * originals archived in data/images/theme/ via scripts/upload-theme-images.mjs)
 * so lib/image-loader.ts serves them as responsive AVIF/WebP. The logo is
 * small and stays in public/theme/.
 */
export const THEME_IMAGES = {
  logo: "/theme/logo-opt.png",
  heroNewArrivals:
    "https://res.cloudinary.com/mgxsgjfs/image/upload/v1783434448/willow-weave/theme/hero-new-arrivals.jpg",
  heroBestsellers:
    "https://res.cloudinary.com/mgxsgjfs/image/upload/v1783434452/willow-weave/theme/hero-bestsellers.png",
  heroFeatured:
    "https://res.cloudinary.com/mgxsgjfs/image/upload/v1783434457/willow-weave/theme/hero-featured.png",
} as const;

export const POLICY_SLUGS = [
  "privacy-policy",
  "refund-policy",
  "terms-of-service",
  "shipping-policy",
] as const;
