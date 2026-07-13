import type {
  CheckoutInput,
  Collection,
  DiscountCode,
  HeroSlide,
  Order,
  OrderStatus,
  PlacedOrder,
  Product,
  SalesStats,
  SizeChart,
  StoreSettings,
  StaffMember,
} from "./repo-types";

export type { PlacedOrderDetails } from "./repo-types";

/**
 * Single data-access interface with two interchangeable adapters:
 *  - local    → data/*.json (zero accounts needed; dev/preview)
 *  - supabase → Postgres with RLS (production)
 * Mode is chosen once from the environment.
 */
export interface Repo {
  // catalog
  getCollections(opts?: { includeUnpublished?: boolean }): Promise<Collection[]>;
  getCollectionByHandle(handle: string): Promise<Collection | null>;
  getProducts(opts?: { includeUnpublished?: boolean }): Promise<Product[]>;
  getProductByHandle(handle: string, opts?: { includeUnpublished?: boolean }): Promise<Product | null>;
  getSizeCharts(): Promise<SizeChart[]>;
  /** Public settings. `notifyEmail` is always "" — it is not public (see getNotifyEmail). */
  getSettings(): Promise<StoreSettings>;
  /** Full settings row for the admin form, including notifyEmail. Staff session required. */
  getSettingsAdmin(): Promise<StoreSettings>;
  /**
   * Where order notifications go. Server-only, trusted read: checkout runs as an
   * anonymous shopper and can't see the staff-only settings row.
   */
  getNotifyEmail(): Promise<string>;
  getHeroSlides(): Promise<HeroSlide[]>;
  /** Curated homepage "The Collections" slots (ordered ids); null = automatic picks. */
  getHomepageCollections(): Promise<string[] | null>;
  /** Saved overrides for editable site pages, keyed by handle (missing = use built-in copy). */
  getSitePages(): Promise<Record<string, { title: string; bodyHtml: string }>>;

  // checkout — confirmation details travel via a short-lived cookie set by the
  // checkout action (never a public order lookup, so order numbers can't be
  // guessed to read customer addresses)
  previewDiscount(code: string, subtotal: number): Promise<{ valid: boolean; amount?: number; code?: string }>;
  placeOrder(input: CheckoutInput): Promise<PlacedOrder>;
  /**
   * Fetch a just-placed order for the confirmation cookie + emails. Bypasses
   * the shopper session (they're anonymous and RLS hides orders from the
   * public), so the Supabase adapter uses the service-role client here.
   * Server-only; never expose the result to the browser wholesale.
   */
  getOrderByNumberTrusted(orderNumber: string): Promise<Order | null>;

  // admin: orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null>;
  setOrderInternalNotes(id: string, notes: string): Promise<void>;
  getStats(): Promise<SalesStats>;

  // admin: catalog
  saveProduct(p: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  setVariantStock(productId: string, variantId: string, stock: number): Promise<void>;
  saveCollection(c: Collection): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  saveSizeChart(s: SizeChart): Promise<SizeChart>;
  deleteSizeChart(id: string): Promise<void>;
  getDiscounts(): Promise<DiscountCode[]>;
  saveDiscount(d: DiscountCode): Promise<void>;
  deleteDiscount(id: string): Promise<void>;
  saveSettings(s: StoreSettings): Promise<void>;
  saveHeroSlides(slides: HeroSlide[]): Promise<void>;
  saveHomepageCollections(ids: string[] | null): Promise<void>;
  saveSitePage(page: { handle: string; title: string; bodyHtml: string }): Promise<void>;
  /** Update only a collection's tile focal point (homepage/collection-list crops). */
  setCollectionTileFocus(id: string, x: number | null, y: number | null): Promise<void>;
  /** Permanently remove an order (fake/bogus entries) regardless of status. */
  deleteOrder(id: string): Promise<void>;
  getStaff(): Promise<StaffMember[]>;
}

export const dataMode: "supabase" | "local" =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "supabase"
    : "local";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";

/**
 * Cache tag covering every public storefront read below. Admin actions and
 * checkout call revalidateTag(DATA_CACHE_TAG) after any write, so the cached
 * reads stay correct while the request-time routes (/products, /search,
 * sorted collections, checkout) stop re-querying the database per request.
 */
export const DATA_CACHE_TAG = "ww-data";
const CACHE_SECONDS = 600; // matches the storefront pages' ISR window

const baseRepo: Repo = dataMode === "supabase" ? supabaseRepo : localRepo;

/**
 * unstable_cache: shares the result across requests (keyed by args) until a
 * write revalidates the tag; react cache(): dedupes repeat calls within one
 * render pass (layout + page + search often ask for the same data).
 */
function cachedRead<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return cache(
    unstable_cache(fn, ["repo", name], { revalidate: CACHE_SECONDS, tags: [DATA_CACHE_TAG] })
  );
}

const publicProducts = cachedRead("products", () => baseRepo.getProducts());
const publicCollections = cachedRead("collections", () => baseRepo.getCollections());
const publicProductByHandle = cachedRead("product-by-handle", (handle: string) =>
  baseRepo.getProductByHandle(handle)
);
const publicCollectionByHandle = cachedRead("collection-by-handle", (handle: string) =>
  baseRepo.getCollectionByHandle(handle)
);
const publicSizeCharts = cachedRead("size-charts", () => baseRepo.getSizeCharts());
const publicSettings = cachedRead("settings", () => baseRepo.getSettings());
const publicHeroSlides = cachedRead("hero-slides", () => baseRepo.getHeroSlides());
const publicHomepageCollections = cachedRead("homepage-collections", () =>
  baseRepo.getHomepageCollections()
);
const publicSitePages = cachedRead("site-pages", () => baseRepo.getSitePages());

/**
 * The adapter with its public catalog reads cached. Admin variants
 * (includeUnpublished) bypass the cache — they're session-bound (RLS) and
 * must always be fresh. Orders, discounts and every write pass through
 * untouched.
 */
export const repo: Repo = {
  ...baseRepo,
  getProducts: (opts) =>
    opts?.includeUnpublished ? baseRepo.getProducts(opts) : publicProducts(),
  getCollections: (opts) =>
    opts?.includeUnpublished ? baseRepo.getCollections(opts) : publicCollections(),
  getProductByHandle: (handle, opts) =>
    opts?.includeUnpublished
      ? baseRepo.getProductByHandle(handle, opts)
      : publicProductByHandle(handle),
  getCollectionByHandle: (handle) => publicCollectionByHandle(handle),
  getSizeCharts: () => publicSizeCharts(),
  getSettings: () => publicSettings(),
  getHeroSlides: () => publicHeroSlides(),
  getHomepageCollections: () => publicHomepageCollections(),
  getSitePages: () => publicSitePages(),
};
