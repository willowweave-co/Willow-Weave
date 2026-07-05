import type { Repo } from "./index";
import type {
  CheckoutInput,
  Collection,
  DiscountCode,
  Order,
  OrderItem,
  OrderStatus,
  PlacedOrder,
  Product,
  SizeChart,
  StaffMember,
  StoreSettings,
} from "@/lib/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { computeStats } from "@/lib/stats";

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
    notes: row.notes,
    paymentMethod: "cod",
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

  async getSettings(): Promise<StoreSettings> {
    const { data, error } = await publicDb()
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
    };
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
      })
      .eq("id", 1);
    if (error) throw error;
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
