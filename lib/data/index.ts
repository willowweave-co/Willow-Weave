import type {
  CheckoutInput,
  Collection,
  DiscountCode,
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
  getSettings(): Promise<StoreSettings>;

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
  getStaff(): Promise<StaffMember[]>;
}

export const dataMode: "supabase" | "local" =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "supabase"
    : "local";

import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";

export const repo: Repo = dataMode === "supabase" ? supabaseRepo : localRepo;
