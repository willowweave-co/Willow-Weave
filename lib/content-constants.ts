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

/** Theme images copied into public/theme/ by the extract script. */
export const THEME_IMAGES = {
  logo: "/theme/Black_Blue_Minimalist_Modern_Initial_Font_Logo_c68e2748-5e38-4174-8d1b-4f6a0bc0e61e.png",
  heroNewArrivals: "/theme/DSC01739.jpg",
  heroBestsellers: "/theme/pomelli_photoshoot-2.png",
  heroFeatured: "/theme/pomelli_photoshoot-7_2.png",
  trending: "/theme/C1031.jpg",
  sizeCharts: "/theme/Size_Charts_fdaffb21-c9d2-4f8b-b74d-413a9fc01592.png",
} as const;

export const POLICY_SLUGS = [
  "privacy-policy",
  "refund-policy",
  "terms-of-service",
  "shipping-policy",
] as const;
