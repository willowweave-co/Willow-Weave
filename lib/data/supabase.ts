import type { Repo } from "./index";
import type {
  CheckoutInput,
  Collection,
  ContactSettings,
  IntlShippingSettings,
  DiscountCode,
  HeroSlide,
  NavConfig,
  Order,
  OrderItem,
  OrderStatus,
  PlacedOrder,
  Product,
  SizeChart,
  StaffMember,
  StoreSettings,
} from "@/lib/types";
import { DEFAULT_BANK_TRANSFER, DEFAULT_CONTACT, DEFAULT_INTL_SHIPPING } from "@/lib/types";
import type { BankTransferSettings } from "@/lib/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { computeStats } from "@/lib/stats";
import { DEFAULT_HERO_SLIDES, DEFAULT_HERO_INTERVAL_MS } from "./hero-defaults";

/**
 * Supabase adapter (production). Reads/writes run under the caller's session:
 * anon shoppers see only the published catalog, staff sessions get write
 * access — enforced by RLS, not just app code. Checkout goes through the
 * place_order RPC (atomic stock decrement + server-side pricing).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const num = (x: unknown): number => Number(x ?? 0);
const numOrNull = (x: unknown): number | null => (x == null ? null : Number(x));

function rowToProduct(row: Row): Product {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position);
  const variants = [...(row.product_variants ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: String(row.id),
    handle: row.handle,
    title: row.title,
    descriptionHtml: row.description_html ?? "",
    productType: row.product_type ?? "",
    fabrics: row.fabrics ?? [],
    tags: row.tags ?? [],
    vendor: row.vendor ?? "Willow Weave",
    publishedAt: row.published_at,
    createdAt: row.created_at,
    sizeChartId: row.size_chart_id != null ? String(row.size_chart_id) : null,
    options: [], // derived below where needed; storefront reads sizes/colors from variants
    images: images.map((i: Row) => ({
      id: String(i.id),
      src: i.url,
      alt: i.alt ?? "",
      width: i.width,
      height: i.height,
      position: i.position,
      focalX: i.focal_x ?? null,
      focalY: i.focal_y ?? null,
    })),
    variants: variants.map((v: Row) => ({
      id: String(v.id),
      title: v.title ?? "",
      size: v.size,
      color: v.color,
      price: num(v.price),
      compareAtPrice: numOrNull(v.compare_at_price),
      stock: v.stock ?? 0,
      sku: v.sku,
      position: v.position,
    })),
  };
}

function rowToCollection(row: Row): Collection {
  const members = [...(row.product_collections ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: String(row.id),
    handle: row.handle,
    title: row.title,
    descriptionHtml: row.description_html ?? "",
    image: row.image_url,
    imageFocalX: row.image_focal_x ?? null,
    imageFocalY: row.image_focal_y ?? null,
    bannerFocalX: row.banner_focal_x ?? null,
    bannerFocalY: row.banner_focal_y ?? null,
    bannerFocalZoom: row.banner_focal_zoom ?? null,
    group: row.group,
    position: row.position ?? 0,
    featured: row.featured ?? false,
    published: row.published ?? true,
    productIds: members.map((m: Row) => String(m.product_id)),
  };
}

function rowToOrder(row: Row): Order {
  const items = (row.order_items ?? []).map(
    (i: Row): OrderItem => ({
      id: String(i.id),
      productId: i.product_id != null ? String(i.product_id) : "",
      variantId: i.variant_id != null ? String(i.variant_id) : "",
      handle: i.handle ?? "",
      title: i.title,
      size: i.size,
      color: i.color,
      unitPrice: num(i.unit_price),
      quantity: i.quantity,
      image: i.image_url,
    })
  );
  return {
    id: String(row.id),
    orderNumber: row.order_number,
    status: row.status,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    country: row.country ?? "Pakistan",
    notes: row.notes,
    paymentMethod: row.payment_method === "bank" ? "bank" : "cod",
    currency: row.currency ?? "PKR",
    displayTotal: numOrNull(row.display_total),
    subtotal: num(row.subtotal),
    discountCode: row.discount_code,
    discountAmount: num(row.discount_amount),
    shippingFee: num(row.shipping_fee),
    total: num(row.total),
    items,
    internalNotes: row.internal_notes,
    statusHistory: row.status_history ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** true → keep DB id; false → let identity assign one */
const isDbId = (id: string) => /^\d+$/.test(id);

/**
 * Session-scoped client (reads the auth cookie) — REQUIRED for admin reads
 * (drafts, orders) and every write, because RLS keys off the staff session.
 * Calling `cookies()` opts the route into dynamic rendering.
 */
async function db() {
  return createSupabaseServer();
}

/** PostgREST/Postgres codes for "that relation or column isn't there (yet)". */
const MISSING_RELATION = ["PGRST205", "42P01", "PGRST204", "42703"];
const isMissingRelation = (e: { code?: string } | null) =>
  !!e?.code && MISSING_RELATION.includes(e.code);

/**
 * Read the public slice of the settings singleton.
 *
 * Prefers store_settings_public (migration 0009), the view that omits
 * notify_email. Falls back to the base table when the view isn't there yet, so
 * the storefront survives a deploy that lands before the migration is run —
 * without the fallback, every page would 500. The fallback is strictly a
 * transitional path: once 0009 is applied, the base table is staff-only and
 * this fallback can no longer read it anyway.
 */
async function publicSettingsRow(columns: string, fallbackColumns?: string): Promise<Row> {
  const view = await publicDb()
    .from("store_settings_public")
    .select(columns)
    .eq("id", 1)
    .maybeSingle();
  if (!view.error && view.data) return view.data as Row;
  if (view.error && !isMissingRelation(view.error)) throw view.error;

  // The view exists but predates newer columns (its whitelist is frozen at
  // creation) — retry with the older column set so the storefront keeps
  // rendering until the latest migration is run.
  if (fallbackColumns) {
    const older = await publicDb()
      .from("store_settings_public")
      .select(fallbackColumns)
      .eq("id", 1)
      .maybeSingle();
    if (!older.error && older.data) return older.data as Row;
    if (older.error && !isMissingRelation(older.error)) throw older.error;
  }

  const legacy = await publicDb().from("store_settings").select(columns).eq("id", 1).single();
  if (legacy.error) throw legacy.error;
  return legacy.data as Row;
}

/**
 * Cookieless anonymous client for PUBLIC catalog reads. Because it never
 * touches `cookies()`, the storefront pages that use it stay statically
 * cacheable (ISR) — fast, and light on the Supabase free tier. RLS still
 * limits it to the published catalog, which is exactly what shoppers see.
 */
// Loosely typed (like the @supabase/ssr client the admin paths use) so the
// shared row-mapping helpers accept its results without a generated Database type.
let _publicClient: SupabaseClient | null = null;
function publicDb(): SupabaseClient {
  _publicClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _publicClient;
}

export const supabaseRepo: Repo = {
  async getCollections(opts) {
    // Admin (includeUnpublished) needs the session for RLS; storefront uses
    // the cookieless client so its pages remain statically cacheable.
    const client = opts?.includeUnpublished ? await db() : publicDb();
    let q = client
      .from("collections")
      .select("*, product_collections(product_id, position)")
      .order("position");
    if (!opts?.includeUnpublished) q = q.eq("published", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(rowToCollection);
  },

  async getCollectionByHandle(handle) {
    const { data, error } = await publicDb()
      .from("collections")
      .select("*, product_collections(product_id, position)")
      .eq("handle", handle)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCollection(data) : null;
  },

  async getProducts(opts) {
    const client = opts?.includeUnpublished ? await db() : publicDb();
    let q = client
      .from("products")
      .select("*, product_images(*), product_variants(*)")
      .order("published_at", { ascending: false, nullsFirst: opts?.includeUnpublished ?? false });
    if (!opts?.includeUnpublished) q = q.not("published_at", "is", null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(rowToProduct);
  },

  async getProductByHandle(handle, opts) {
    const client = opts?.includeUnpublished ? await db() : publicDb();
    const { data, error } = await client
      .from("products")
      .select("*, product_images(*), product_variants(*)")
      .eq("handle", handle)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const p = rowToProduct(data);
    if (!p.publishedAt && !opts?.includeUnpublished) return null;
    return p;
  },

  async getSizeCharts() {
    const { data, error } = await publicDb().from("size_charts").select("*").order("id");
    if (error) throw error;
    return (data ?? []).map(
      (r: Row): SizeChart => ({
        id: String(r.id),
        name: r.name,
        appliesTo: r.applies_to ?? "",
        columns: r.columns ?? [],
        rows: r.rows ?? [],
        note: r.note ?? "",
      })
    );
  },

  /**
   * PUBLIC settings — served from the store_settings_public view, which omits
   * notify_email (the owner's private inbox). notifyEmail is always "" here;
   * the trusted paths that need it call getNotifyEmail().
   */
  async getSettings(): Promise<StoreSettings> {
    const data = await publicSettingsRow(
      "id, store_name, shipping_fee, free_shipping_threshold, announcement, announcement_color, contact, intl_shipping, bank_transfer",
      // pre-0011 view (frozen whitelist) — newer fields fall back to defaults
      "id, store_name, shipping_fee, free_shipping_threshold, announcement, contact"
    );
    return {
      storeName: data.store_name,
      shippingFee: num(data.shipping_fee),
      freeShippingThreshold: numOrNull(data.free_shipping_threshold),
      notifyEmail: "",
      announcement: data.announcement,
      // merge over defaults so partially-saved / pre-migration rows stay complete
      contact: { ...DEFAULT_CONTACT, ...((data.contact as Partial<ContactSettings>) ?? {}) },
      intlShipping: {
        ...DEFAULT_INTL_SHIPPING,
        ...((data.intl_shipping as Partial<IntlShippingSettings>) ?? {}),
      },
      announcementColor: data.announcement_color ?? null,
      bankTransfer: {
        ...DEFAULT_BANK_TRANSFER,
        ...((data.bank_transfer as Partial<BankTransferSettings>) ?? {}),
      },
    };
  },

  /** Staff-session read of the full row (includes notify_email) for the admin form. */
  async getSettingsAdmin(): Promise<StoreSettings> {
    const client = await db();
    const { data, error } = await client
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return {
      storeName: data.store_name,
      shippingFee: num(data.shipping_fee),
      freeShippingThreshold: numOrNull(data.free_shipping_threshold),
      notifyEmail: data.notify_email ?? "",
      announcement: data.announcement,
      contact: { ...DEFAULT_CONTACT, ...((data.contact as Partial<ContactSettings>) ?? {}) },
      intlShipping: {
        ...DEFAULT_INTL_SHIPPING,
        ...((data.intl_shipping as Partial<IntlShippingSettings>) ?? {}),
      },
      announcementColor: data.announcement_color ?? null,
      bankTransfer: {
        ...DEFAULT_BANK_TRANSFER,
        ...((data.bank_transfer as Partial<BankTransferSettings>) ?? {}),
      },
    };
  },

  /**
   * Where new-order notifications go. Needed by the checkout action, which runs
   * for an ANONYMOUS shopper and so cannot read the staff-only settings row —
   * hence the service-role client. Server-only; never return this to a browser.
   */
  async getNotifyEmail(): Promise<string> {
    const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("store_settings")
      .select("notify_email")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return data.notify_email ?? "";
  },

  async getHeroSlides(): Promise<HeroSlide[]> {
    try {
      const data = await publicSettingsRow("id, hero_slides");
      // null until the owner first saves
      return (data.hero_slides as HeroSlide[] | null) ?? DEFAULT_HERO_SLIDES;
    } catch (e) {
      // column doesn't exist yet (migration 0003 not applied) — the storefront
      // must still render, so fall back to the seed slides.
      if (isMissingRelation(e as { code?: string })) return DEFAULT_HERO_SLIDES;
      throw e;
    }
  },

  async getHeroIntervalMs(): Promise<number> {
    try {
      // fallback column set: the view's whitelist is frozen at creation, so
      // before 0014 runs it still answers for "id, hero_slides" alone
      const data = await publicSettingsRow("id, hero_interval_ms", "id, hero_slides");
      const ms = data.hero_interval_ms as number | null | undefined;
      return typeof ms === "number" ? ms : DEFAULT_HERO_INTERVAL_MS;
    } catch (e) {
      // migration 0014 not applied — the slideshow keeps its old cadence
      if (isMissingRelation(e as { code?: string })) return DEFAULT_HERO_INTERVAL_MS;
      throw e;
    }
  },

  async getSitePages(): Promise<Record<string, { title: string; bodyHtml: string }>> {
    const { data, error } = await publicDb().from("site_pages").select("*");
    // Table doesn't exist yet (migration 0007 not applied) — the storefront
    // must still render, so fall back to the built-in copy. PostgREST reports
    // missing tables as PGRST205 (schema cache), Postgres itself as 42P01.
    if (error?.code === "PGRST205" || error?.code === "42P01") return {};
    if (error) throw error;
    const out: Record<string, { title: string; bodyHtml: string }> = {};
    for (const row of data ?? []) {
      out[row.handle] = { title: row.title, bodyHtml: row.body_html ?? "" };
    }
    return out;
  },

  async getNavConfig(): Promise<NavConfig | null> {
    try {
      // fallback column set: the view's whitelist is frozen at creation, so
      // before 0015 runs it still answers for the older columns alone
      const data = await publicSettingsRow("id, nav_config", "id, hero_slides");
      return (data.nav_config as NavConfig | null) ?? null;
    } catch (e) {
      // migration 0015 not applied — the header follows the collections, as
      // it always did
      if (isMissingRelation(e as { code?: string })) return null;
      throw e;
    }
  },

  async saveNavConfig(config: NavConfig | null) {
    const client = await db();
    const { error } = await client
      .from("store_settings")
      .update({ nav_config: config })
      .eq("id", 1);
    if (error) throw error;
  },

  async getHomepageCollections(): Promise<string[] | null> {
    try {
      const data = await publicSettingsRow("id, homepage_collections");
      const ids = data.homepage_collections as string[] | null;
      return Array.isArray(ids) && ids.length ? ids.map(String) : null;
    } catch (e) {
      // migration 0006 not applied yet — fall back to automatic picks
      if (isMissingRelation(e as { code?: string })) return null;
      throw e;
    }
  },

  async previewDiscount(code, subtotal) {
    const { data, error } = await publicDb().rpc("preview_discount", {
      p_code: code,
      p_subtotal: subtotal,
    });
    if (error) throw error;
    return data?.valid
      ? { valid: true, amount: num(data.amount), code: data.code }
      : { valid: false };
  },

  async placeOrder(input: CheckoutInput): Promise<PlacedOrder> {
    const client = publicDb();
    const { data, error } = await client.rpc("place_order", {
      p_customer_name: input.customerName,
      p_phone: input.phone,
      p_email: input.email,
      p_address: input.address,
      p_city: input.city,
      p_country: input.country || "Pakistan",
      p_payment_method: input.paymentMethod,
      p_currency: input.currency || "PKR",
      p_display_rate: input.displayRate,
      p_notes: input.notes,
      p_discount_code: input.discountCode,
      p_items: input.items.map((i) => ({ variant_id: Number(i.variantId), quantity: i.quantity })),
    });
    if (error) throw new Error(error.message);
    return { orderNumber: data.order_number, total: num(data.total) };
  },

  async getOrders() {
    const client = await db();
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToOrder);
  },

  async getOrder(id) {
    const client = await db();
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", Number(id))
      .maybeSingle();
    if (error) throw error;
    return data ? rowToOrder(data) : null;
  },

  async getOrderByNumberTrusted(orderNumber) {
    // Anonymous shopper at checkout → use the service-role client so the
    // confirmation page + order emails can read the order RLS hides from them.
    const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("orders")
      .select("*, order_items(*)")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToOrder(data) : null;
  },

  async updateOrderStatus(id, status: OrderStatus) {
    const client = await db();
    const current = await this.getOrder(id);
    if (!current) return null;
    if (current.status === status) return current;

    const delta =
      status === "cancelled" && current.status !== "cancelled" ? +1
      : current.status === "cancelled" && status !== "cancelled" ? -1 : 0;
    if (delta !== 0) {
      for (const item of current.items) {
        if (!item.variantId) continue;
        const { data: v } = await client
          .from("product_variants")
          .select("stock")
          .eq("id", Number(item.variantId))
          .maybeSingle();
        if (v) {
          await client
            .from("product_variants")
            .update({ stock: Math.max(0, v.stock + delta * item.quantity) })
            .eq("id", Number(item.variantId));
        }
      }
    }

    const history = [...current.statusHistory, { status, at: new Date().toISOString() }];
    const { data, error } = await client
      .from("orders")
      .update({ status, status_history: history, updated_at: new Date().toISOString() })
      .eq("id", Number(id))
      .select("*, order_items(*)")
      .single();
    if (error) throw error;
    return rowToOrder(data);
  },

  async setOrderInternalNotes(id, notes) {
    const client = await db();
    const { error } = await client
      .from("orders")
      .update({ internal_notes: notes, updated_at: new Date().toISOString() })
      .eq("id", Number(id));
    if (error) throw error;
  },

  async getStats() {
    const [orders, products] = await Promise.all([
      this.getOrders(),
      this.getProducts({ includeUnpublished: true }),
    ]);
    return computeStats(orders, products);
  },

  async saveProduct(p: Product) {
    const client = await db();
    const productRow = {
      ...(isDbId(p.id) ? { id: Number(p.id) } : {}),
      handle: p.handle,
      title: p.title,
      description_html: p.descriptionHtml,
      product_type: p.productType,
      fabrics: p.fabrics,
      tags: p.tags,
      vendor: p.vendor,
      published_at: p.publishedAt,
      size_chart_id: p.sizeChartId != null ? Number(p.sizeChartId) : null,
    };
    const { data: saved, error } = await client
      .from("products")
      .upsert(productRow, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    const productId = saved.id as number;

    // variants: upsert existing, insert new, delete removed
    const { data: existingVariants } = await client
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);
    const keepVariantIds = new Set(p.variants.filter((v) => isDbId(v.id)).map((v) => Number(v.id)));
    const removeVariants = (existingVariants ?? []).filter((v: Row) => !keepVariantIds.has(v.id));
    if (removeVariants.length) {
      await client.from("product_variants").delete().in("id", removeVariants.map((v: Row) => v.id));
    }
    for (const [idx, v] of p.variants.entries()) {
      const row = {
        ...(isDbId(v.id) ? { id: Number(v.id) } : {}),
        product_id: productId,
        title: v.title || [v.color, v.size].filter(Boolean).join(" / "),
        size: v.size,
        color: v.color,
        price: v.price,
        compare_at_price: v.compareAtPrice,
        stock: v.stock,
        sku: v.sku,
        position: idx,
      };
      const { error: vErr } = await client.from("product_variants").upsert(row, { onConflict: "id" });
      if (vErr) throw vErr;
    }

    // images: same strategy
    const { data: existingImages } = await client
      .from("product_images")
      .select("id")
      .eq("product_id", productId);
    const keepImageIds = new Set(p.images.filter((i) => isDbId(i.id)).map((i) => Number(i.id)));
    const removeImages = (existingImages ?? []).filter((i: Row) => !keepImageIds.has(i.id));
    if (removeImages.length) {
      await client.from("product_images").delete().in("id", removeImages.map((i: Row) => i.id));
    }
    for (const [idx, img] of p.images.entries()) {
      const row = {
        ...(isDbId(img.id) ? { id: Number(img.id) } : {}),
        product_id: productId,
        url: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        position: idx,
        focal_x: img.focalX ?? null,
        focal_y: img.focalY ?? null,
      };
      const { error: iErr } = await client.from("product_images").upsert(row, { onConflict: "id" });
      if (iErr) throw iErr;
    }

    // collection membership (transient field on the domain object)
    if (p.collectionIds) {
      await client.from("product_collections").delete().eq("product_id", productId);
      if (p.collectionIds.length) {
        const { error: mErr } = await client.from("product_collections").insert(
          p.collectionIds.map((cid, idx) => ({
            product_id: productId,
            collection_id: Number(cid),
            position: idx,
          }))
        );
        if (mErr) throw mErr;
      }
    }
  },

  async deleteProduct(id) {
    const client = await db();
    const { error } = await client.from("products").delete().eq("id", Number(id));
    if (error) throw error;
  },

  async setVariantStock(_productId, variantId, stock) {
    const client = await db();
    const { error } = await client
      .from("product_variants")
      .update({ stock: Math.max(0, Math.floor(stock)) })
      .eq("id", Number(variantId));
    if (error) throw error;
  },

  async saveCollection(c: Collection) {
    const client = await db();
    const row = {
      ...(isDbId(c.id) ? { id: Number(c.id) } : {}),
      handle: c.handle,
      title: c.title,
      description_html: c.descriptionHtml,
      image_url: c.image,
      image_focal_x: c.imageFocalX ?? null,
      image_focal_y: c.imageFocalY ?? null,
      banner_focal_x: c.bannerFocalX ?? null,
      banner_focal_y: c.bannerFocalY ?? null,
      banner_focal_zoom: c.bannerFocalZoom ?? null,
      group: c.group,
      position: c.position,
      featured: c.featured,
      published: c.published,
    };
    const { data: saved, error } = await client
      .from("collections")
      .upsert(row, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;

    await client.from("product_collections").delete().eq("collection_id", saved.id);
    if (c.productIds.length) {
      const { error: mErr } = await client.from("product_collections").insert(
        c.productIds.map((pid, idx) => ({
          product_id: Number(pid),
          collection_id: saved.id,
          position: idx,
        }))
      );
      if (mErr) throw mErr;
    }
  },

  async deleteCollection(id) {
    const client = await db();
    const { error } = await client.from("collections").delete().eq("id", Number(id));
    if (error) throw error;
  },

  async saveSizeChart(s: SizeChart) {
    const client = await db();
    const row = {
      ...(s.id && isDbId(s.id) ? { id: Number(s.id) } : {}),
      name: s.name,
      applies_to: s.appliesTo,
      columns: s.columns,
      rows: s.rows,
      note: s.note,
    };
    const { data, error } = await client
      .from("size_charts")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return { ...s, id: String(data.id) };
  },

  async deleteSizeChart(id) {
    const client = await db();
    const { error } = await client.from("size_charts").delete().eq("id", Number(id));
    if (error) throw error;
  },

  async getDiscounts() {
    const client = await db();
    const { data, error } = await client.from("discount_codes").select("*").order("id");
    if (error) throw error;
    return (data ?? []).map(
      (r: Row): DiscountCode => ({
        id: String(r.id),
        code: r.code,
        type: r.type,
        value: num(r.value),
        minSubtotal: num(r.min_subtotal),
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        usageLimit: r.usage_limit,
        timesUsed: r.times_used,
        active: r.active,
      })
    );
  },

  async saveDiscount(d: DiscountCode) {
    const client = await db();
    const row = {
      ...(d.id && isDbId(d.id) ? { id: Number(d.id) } : {}),
      code: d.code.toUpperCase().trim(),
      type: d.type,
      value: d.value,
      min_subtotal: d.minSubtotal,
      starts_at: d.startsAt,
      ends_at: d.endsAt,
      usage_limit: d.usageLimit,
      times_used: d.timesUsed,
      active: d.active,
    };
    const { error } = await client.from("discount_codes").upsert(row, { onConflict: "id" });
    if (error) throw error;
  },

  async deleteDiscount(id) {
    const client = await db();
    const { error } = await client.from("discount_codes").delete().eq("id", Number(id));
    if (error) throw error;
  },

  async saveSettings(s: StoreSettings) {
    const client = await db();
    const { error } = await client
      .from("store_settings")
      .update({
        store_name: s.storeName,
        shipping_fee: s.shippingFee,
        free_shipping_threshold: s.freeShippingThreshold,
        notify_email: s.notifyEmail,
        announcement: s.announcement,
        announcement_color: s.announcementColor,
        contact: s.contact,
        intl_shipping: s.intlShipping,
        bank_transfer: s.bankTransfer,
      })
      .eq("id", 1);
    if (error) throw error;
  },

  async saveHeroSlides(slides: HeroSlide[], intervalMs?: number) {
    const client = await db();
    const wantsInterval = typeof intervalMs === "number";
    const patch: Record<string, unknown> = { hero_slides: slides };
    if (wantsInterval) patch.hero_interval_ms = intervalMs;

    const first = await client.from("store_settings").update(patch).eq("id", 1);
    if (!first.error) return { intervalSaved: wantsInterval };

    // Pre-0014 database: hero_interval_ms doesn't exist yet. PostgREST reports
    // an unknown column on a WRITE as PGRST204 (schema-cache miss), not the
    // 42703 that a read raises — so this has to be caught by shape, not by
    // guessing the code. Retry without the timing rather than losing the
    // owner's slide edits to a column they haven't migrated in yet.
    if (wantsInterval && isMissingRelation(first.error)) {
      const retry = await client
        .from("store_settings")
        .update({ hero_slides: slides })
        .eq("id", 1);
      if (retry.error) throw retry.error;
      return { intervalSaved: false };
    }
    throw first.error;
  },

  async saveHomepageCollections(ids: string[] | null) {
    const client = await db();
    const { error } = await client
      .from("store_settings")
      .update({ homepage_collections: ids })
      .eq("id", 1);
    if (error) throw error;
  },

  async saveSitePage(page: { handle: string; title: string; bodyHtml: string }) {
    const client = await db();
    const { error } = await client.from("site_pages").upsert(
      {
        handle: page.handle,
        title: page.title,
        body_html: page.bodyHtml,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "handle" }
    );
    if (error) throw error;
  },

  async setCollectionTileFocus(id: string, x: number | null, y: number | null) {
    const client = await db();
    const { error } = await client
      .from("collections")
      .update({ image_focal_x: x, image_focal_y: y })
      .eq("id", Number(id));
    if (error) throw error;
  },

  async deleteOrder(id: string) {
    // Owner-only, enforced by the "owner delete orders" RLS policy (0009) —
    // the session client, not the service role, so the database has the final
    // say rather than the app. Items cascade via FK.
    const client = await db();
    const { data, error } = await client
      .from("orders")
      .delete()
      .eq("id", Number(id))
      .select("id");
    if (error) throw error;
    // RLS refuses a delete by matching zero rows rather than erroring, so an
    // empty result means "not permitted" (or migration 0009 isn't applied) —
    // don't report success for a delete that never happened.
    if (!data?.length) throw new Error("ORDER_DELETE_DENIED");
  },

  async getStaff(): Promise<StaffMember[]> {
    const client = await db();
    const { data, error } = await client.from("profiles").select("*").order("created_at");
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
    }));
  },
};
