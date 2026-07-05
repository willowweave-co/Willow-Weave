import { promises as fs } from "node:fs";
import path from "node:path";
import type { Repo } from "./index";
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
  StaffMember,
  StoreSettings,
} from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { validateDiscount, MAX_ITEM_QTY } from "@/lib/discounts";

/**
 * Local-mode adapter: the full store running against data/*.json.
 *  - Base catalog: data/catalog.json (scraped, immutable archive)
 *  - Admin edits:  data/dev/store.json (overlay applied on top of the base)
 *  - Orders:       data/dev/orders.json
 * Lets the owner review and even fully exercise the site (checkout included)
 * before any Supabase/Cloudinary/Resend account exists.
 */

const DATA = path.join(process.cwd(), "data");
const DEV = path.join(DATA, "dev");
const STORE_FILE = path.join(DEV, "store.json");
const ORDERS_FILE = path.join(DEV, "orders.json");

const FEATURED_HANDLES = new Set(["eid-ul-adha-2026", "volume-5-sun-kisses-threads"]);

// ── raw catalog.json shapes (from scripts/extract-content.mjs) ──────────────
interface RawVariant {
  id: number; title: string; size: string | null; color: string | null;
  price: number; compareAtPrice: number | null; available: boolean;
  stock: number; sku: string | null; position: number;
}
interface RawImage { id: number; src: string; local: string | null; width: number | null; height: number | null; position: number; alt: string }
interface RawProduct {
  id: number; handle: string; title: string; descriptionHtml: string; vendor: string;
  productType: string; tags: string[]; fabrics: string[]; publishedAt: string | null;
  createdAt: string; options: { name: string; values: string[] }[];
  variants: RawVariant[]; images: RawImage[];
}
interface RawCollection {
  id: number; handle: string; title: string; description: string;
  imageSrc: string | null; group: Collection["group"]; position: number; productIds: number[];
}

interface Overlay {
  products: Record<string, Product | { __deleted: true }>;
  newProducts: Product[];
  collections: Record<string, Collection | { __deleted: true }>;
  newCollections: Collection[];
  sizeCharts: SizeChart[] | null;
  discounts: DiscountCode[];
  settings: StoreSettings | null;
}

const EMPTY_OVERLAY: Overlay = {
  products: {},
  newProducts: [],
  collections: {},
  newCollections: [],
  sizeCharts: null,
  discounts: [],
  settings: null,
};

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Willow Weave",
  shippingFee: 250,
  freeShippingThreshold: null,
  notifyEmail: process.env.ORDER_NOTIFY_EMAIL ?? "ausatali27@gmail.com",
  announcement: null,
};

// ── base catalog (loaded once per process) ───────────────────────────────────
let _base: Promise<{ products: Product[]; collections: Collection[]; sizeCharts: SizeChart[] }> | null = null;

function chartIdFor(p: RawProduct): string | null {
  const t = p.productType.toLowerCase();
  if (t.includes("trouser")) return "2";
  return "1"; // tops chart is the relevant fitted-garment chart for suits/tops
}

async function loadBase() {
  const [catalogStr, chartsStr] = await Promise.all([
    fs.readFile(path.join(DATA, "catalog.json"), "utf8"),
    fs.readFile(path.join(DATA, "size-charts.json"), "utf8"),
  ]);
  const catalog = JSON.parse(catalogStr) as { products: RawProduct[]; collections: RawCollection[] };
  const chartsJson = JSON.parse(chartsStr) as { charts: (Omit<SizeChart, "id"> & { id: string })[] };

  const products: Product[] = catalog.products.map((p) => ({
    id: String(p.id),
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType,
    fabrics: p.fabrics,
    tags: p.tags,
    vendor: p.vendor,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    options: p.options,
    sizeChartId: chartIdFor(p),
    images: p.images.map((img) => ({
      id: String(img.id),
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height,
      position: img.position,
    })),
    variants: p.variants.map((v) => ({
      id: String(v.id),
      title: v.title,
      size: v.size,
      color: v.color,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      sku: v.sku,
      position: v.position,
    })),
  }));

  const collections: Collection[] = catalog.collections.map((c) => ({
    id: String(c.id),
    handle: c.handle,
    title: c.title,
    descriptionHtml: c.description,
    image: c.imageSrc,
    group: c.group,
    position: c.position,
    featured: FEATURED_HANDLES.has(c.handle),
    published: true,
    productIds: c.productIds.map(String),
  }));

  return { products, collections, sizeCharts: chartsJson.charts };
}

function base() {
  _base ??= loadBase();
  return _base;
}

// ── dev overlay + orders persistence (serialized writes) ────────────────────
let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
}

async function readJsonSafe<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file).catch(async () => {
    // Windows rename-over-existing can be flaky; fall back to direct write
    await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
  });
}

const loadOverlay = () => readJsonSafe<Overlay>(STORE_FILE, EMPTY_OVERLAY);
const saveOverlay = (o: Overlay) => writeJsonAtomic(STORE_FILE, o);
const loadOrders = () => readJsonSafe<Order[]>(ORDERS_FILE, []);
const saveOrders = (o: Order[]) => writeJsonAtomic(ORDERS_FILE, o);

async function effectiveProducts(): Promise<Product[]> {
  const [{ products }, overlay] = await Promise.all([base(), loadOverlay()]);
  const out: Product[] = [];
  for (const p of overlay.newProducts) out.push(p);
  for (const p of products) {
    const ov = overlay.products[p.id];
    if (ov && "__deleted" in ov) continue;
    out.push(ov ?? p);
  }
  return out;
}

async function effectiveCollections(): Promise<Collection[]> {
  const [{ collections }, overlay] = await Promise.all([base(), loadOverlay()]);
  const out: Collection[] = [];
  for (const c of collections) {
    const ov = overlay.collections[c.id];
    if (ov && "__deleted" in ov) continue;
    out.push(ov ?? c);
  }
  out.push(...overlay.newCollections);
  return out.sort((a, b) => a.position - b.position);
}

/** Mutate a product inside an ALREADY-loaded overlay (no lock — caller holds it). */
function mutateProductInOverlay(
  overlay: Overlay,
  baseProducts: Product[],
  id: string,
  fn: (p: Product) => Product
): void {
  const newIdx = overlay.newProducts.findIndex((p) => p.id === id);
  if (newIdx >= 0) {
    overlay.newProducts[newIdx] = fn(structuredClone(overlay.newProducts[newIdx]));
    return;
  }
  const existing = overlay.products[id];
  let current: Product | undefined;
  if (existing && !("__deleted" in existing)) current = existing as Product;
  else current = baseProducts.find((p) => p.id === id);
  if (!current) return;
  overlay.products[id] = fn(structuredClone(current));
}

async function mutateProduct(id: string, fn: (p: Product) => Product): Promise<void> {
  await withLock(async () => {
    const overlay = await loadOverlay();
    const baseProducts = (await base()).products;
    mutateProductInOverlay(overlay, baseProducts, id, fn);
    await saveOverlay(overlay);
  });
}

function nextOrderNumber(orders: Order[]): string {
  let max = 1000;
  for (const o of orders) {
    const n = Number(o.orderNumber.replace(/\D/g, ""));
    if (n > max) max = n;
  }
  return `WW-${max + 1}`;
}

// ── the adapter ──────────────────────────────────────────────────────────────
export const localRepo: Repo = {
  async getCollections(opts) {
    const all = await effectiveCollections();
    return opts?.includeUnpublished ? all : all.filter((c) => c.published);
  },

  async getCollectionByHandle(handle) {
    return (await effectiveCollections()).find((c) => c.handle === handle) ?? null;
  },

  async getProducts(opts) {
    const all = await effectiveProducts();
    return opts?.includeUnpublished ? all : all.filter((p) => p.publishedAt);
  },

  async getProductByHandle(handle, opts) {
    const p = (await effectiveProducts()).find((x) => x.handle === handle) ?? null;
    if (!p) return null;
    if (!p.publishedAt && !opts?.includeUnpublished) return null;
    return p;
  },

  async getSizeCharts() {
    const overlay = await loadOverlay();
    return overlay.sizeCharts ?? (await base()).sizeCharts;
  },

  async getSettings() {
    const overlay = await loadOverlay();
    return overlay.settings ?? DEFAULT_SETTINGS;
  },

  async previewDiscount(code, subtotal) {
    const discounts = await this.getDiscounts();
    const d = discounts.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
    const res = validateDiscount(d, subtotal);
    return res.valid ? { valid: true, amount: res.amount, code: d!.code } : { valid: false };
  },

  async placeOrder(input: CheckoutInput): Promise<PlacedOrder> {
    return withLock(async () => {
      const products = await effectiveProducts();
      const settings = await this.getSettings();
      const overlay = await loadOverlay();
      const orders = await loadOrders();

      if (!input.items.length) throw new Error("EMPTY_CART");

      const lines: { product: Product; variantId: string; quantity: number }[] = [];
      let subtotal = 0;
      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QTY) {
          throw new Error("BAD_QUANTITY");
        }
        const product = products.find((p) => p.variants.some((v) => v.id === item.variantId));
        if (!product) throw new Error(`VARIANT_NOT_FOUND:${item.variantId}`);
        if (!product.publishedAt) throw new Error(`PRODUCT_UNAVAILABLE:${product.handle}`);
        const variant = product.variants.find((v) => v.id === item.variantId)!;
        if (variant.stock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.title}:${variant.size ?? variant.title}`);
        }
        subtotal += variant.price * item.quantity;
        lines.push({ product, variantId: item.variantId, quantity: item.quantity });
      }

      let discountAmount = 0;
      let appliedCode: string | null = null;
      if (input.discountCode?.trim()) {
        const d = overlay.discounts.find(
          (x) => x.code.toUpperCase() === input.discountCode!.trim().toUpperCase()
        );
        const res = validateDiscount(d, subtotal);
        if (!res.valid) throw new Error("INVALID_DISCOUNT");
        discountAmount = res.amount;
        appliedCode = d!.code;
        d!.timesUsed += 1;
      }

      let shipping = settings.shippingFee;
      if (settings.freeShippingThreshold != null && subtotal - discountAmount >= settings.freeShippingThreshold) {
        shipping = 0;
      }

      const now = new Date().toISOString();
      const order: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        orderNumber: nextOrderNumber(orders),
        status: "pending",
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        notes: input.notes,
        paymentMethod: "cod",
        subtotal,
        discountCode: appliedCode,
        discountAmount,
        shippingFee: shipping,
        total: subtotal - discountAmount + shipping,
        items: lines.map((l) => {
          const v = l.product.variants.find((x) => x.id === l.variantId)!;
          return {
            id: `itm_${l.variantId}`,
            productId: l.product.id,
            variantId: l.variantId,
            handle: l.product.handle,
            title: l.product.title,
            size: v.size,
            color: v.color,
            unitPrice: v.price,
            quantity: l.quantity,
            image: l.product.images[0]?.src ?? null,
          };
        }),
        internalNotes: null,
        statusHistory: [{ status: "pending", at: now }],
        createdAt: now,
        updatedAt: now,
      };

      // decrement stock through the overlay
      for (const l of lines) {
        const target = structuredClone(
          (overlay.products[l.product.id] && !("__deleted" in overlay.products[l.product.id]!)
            ? (overlay.products[l.product.id] as Product)
            : undefined) ??
            overlay.newProducts.find((p) => p.id === l.product.id) ??
            l.product
        );
        const v = target.variants.find((x) => x.id === l.variantId)!;
        v.stock -= l.quantity;
        const newIdx = overlay.newProducts.findIndex((p) => p.id === l.product.id);
        if (newIdx >= 0) overlay.newProducts[newIdx] = target;
        else overlay.products[l.product.id] = target;
      }

      orders.unshift(order);
      await saveOverlay(overlay);
      await saveOrders(orders);
      return { orderNumber: order.orderNumber, total: order.total };
    });
  },

  async getOrders() {
    const orders = await loadOrders();
    return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrder(id) {
    return (await loadOrders()).find((o) => o.id === id || o.orderNumber === id) ?? null;
  },

  async getOrderByNumberTrusted(orderNumber) {
    return (await loadOrders()).find((o) => o.orderNumber === orderNumber) ?? null;
  },

  async updateOrderStatus(id, status: OrderStatus) {
    return withLock(async () => {
      const orders = await loadOrders();
      const order = orders.find((o) => o.id === id);
      if (!order) return null;
      const prev = order.status;
      if (prev === status) return order;

      // restock when cancelling; re-consume when un-cancelling
      // (mutate the overlay inline — calling mutateProduct here would try to
      // re-acquire the write lock this function already holds and deadlock)
      const delta = status === "cancelled" && prev !== "cancelled" ? +1
        : prev === "cancelled" && status !== "cancelled" ? -1 : 0;
      if (delta !== 0) {
        const overlay = await loadOverlay();
        const baseProducts = (await base()).products;
        for (const item of order.items) {
          mutateProductInOverlay(overlay, baseProducts, item.productId, (p) => {
            const v = p.variants.find((x) => x.id === item.variantId);
            if (v) v.stock = Math.max(0, v.stock + delta * item.quantity);
            return p;
          });
        }
        await saveOverlay(overlay);
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();
      order.statusHistory.push({ status, at: order.updatedAt });
      await saveOrders(orders);
      return order;
    });
  },

  async setOrderInternalNotes(id, notes) {
    await withLock(async () => {
      const orders = await loadOrders();
      const order = orders.find((o) => o.id === id);
      if (!order) return;
      order.internalNotes = notes;
      order.updatedAt = new Date().toISOString();
      await saveOrders(orders);
    });
  },

  async getStats(): Promise<SalesStats> {
    const [orders, products] = await Promise.all([loadOrders(), effectiveProducts()]);
    return computeStats(orders, products);
  },

  async saveProduct(p: Product) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      const { collectionIds, ...productData } = p;
      const product = productData as Product;
      const baseHas = (await base()).products.some((x) => x.id === product.id);
      if (baseHas) {
        overlay.products[product.id] = product;
      } else {
        const idx = overlay.newProducts.findIndex((x) => x.id === product.id);
        if (idx >= 0) overlay.newProducts[idx] = product;
        else overlay.newProducts.unshift(product);
      }

      // sync collection membership when the form provided it
      if (collectionIds) {
        const baseCollections = (await base()).collections;
        const wanted = new Set(collectionIds);
        const allIds = new Set([
          ...baseCollections.map((c) => c.id),
          ...overlay.newCollections.map((c) => c.id),
        ]);
        for (const cid of allIds) {
          const overlayHit = overlay.collections[cid];
          const currentBase = baseCollections.find((c) => c.id === cid);
          const current =
            overlayHit && !("__deleted" in overlayHit)
              ? (overlayHit as Collection)
              : overlay.newCollections.find((c) => c.id === cid) ?? currentBase;
          if (!current || (overlayHit && "__deleted" in overlayHit)) continue;
          const has = current.productIds.includes(product.id);
          const should = wanted.has(cid);
          if (has === should) continue;
          const updated = structuredClone(current);
          updated.productIds = should
            ? [...updated.productIds, product.id]
            : updated.productIds.filter((x) => x !== product.id);
          const newIdx = overlay.newCollections.findIndex((c) => c.id === cid);
          if (newIdx >= 0) overlay.newCollections[newIdx] = updated;
          else overlay.collections[cid] = updated;
        }
      }
      await saveOverlay(overlay);
    });
  },

  async deleteProduct(id) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      const idx = overlay.newProducts.findIndex((x) => x.id === id);
      if (idx >= 0) overlay.newProducts.splice(idx, 1);
      else overlay.products[id] = { __deleted: true };
      // remove from any collection membership overrides
      for (const key of Object.keys(overlay.collections)) {
        const c = overlay.collections[key];
        if (c && !("__deleted" in c)) c.productIds = c.productIds.filter((pid) => pid !== id);
      }
      await saveOverlay(overlay);
    });
  },

  async setVariantStock(productId, variantId, stock) {
    await mutateProduct(productId, (p) => {
      const v = p.variants.find((x) => x.id === variantId);
      if (v) v.stock = Math.max(0, Math.floor(stock));
      return p;
    });
  },

  async saveCollection(c: Collection) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      const baseHas = (await base()).collections.some((x) => x.id === c.id);
      if (baseHas) {
        overlay.collections[c.id] = c;
      } else {
        const idx = overlay.newCollections.findIndex((x) => x.id === c.id);
        if (idx >= 0) overlay.newCollections[idx] = c;
        else overlay.newCollections.push(c);
      }
      await saveOverlay(overlay);
    });
  },

  async deleteCollection(id) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      const idx = overlay.newCollections.findIndex((x) => x.id === id);
      if (idx >= 0) overlay.newCollections.splice(idx, 1);
      else overlay.collections[id] = { __deleted: true };
      await saveOverlay(overlay);
    });
  },

  async saveSizeChart(s: SizeChart) {
    return withLock(async () => {
      const overlay = await loadOverlay();
      const charts = overlay.sizeCharts ?? structuredClone((await base()).sizeCharts);
      const saved: SizeChart = s.id
        ? s
        : { ...s, id: String(Math.max(0, ...charts.map((c) => Number(c.id) || 0)) + 1) };
      const idx = charts.findIndex((c) => c.id === saved.id);
      if (idx >= 0) charts[idx] = saved;
      else charts.push(saved);
      overlay.sizeCharts = charts;
      await saveOverlay(overlay);
      return saved;
    });
  },

  async deleteSizeChart(id) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      const charts = overlay.sizeCharts ?? structuredClone((await base()).sizeCharts);
      overlay.sizeCharts = charts.filter((c) => c.id !== id);
      await saveOverlay(overlay);
    });
  },

  async getDiscounts() {
    return (await loadOverlay()).discounts;
  },

  async saveDiscount(d: DiscountCode) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      const saved: DiscountCode = d.id
        ? d
        : { ...d, id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
      const idx = overlay.discounts.findIndex((x) => x.id === saved.id);
      if (idx >= 0) overlay.discounts[idx] = saved;
      else overlay.discounts.push(saved);
      await saveOverlay(overlay);
    });
  },

  async deleteDiscount(id) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      overlay.discounts = overlay.discounts.filter((x) => x.id !== id);
      await saveOverlay(overlay);
    });
  },

  async saveSettings(s: StoreSettings) {
    await withLock(async () => {
      const overlay = await loadOverlay();
      overlay.settings = s;
      await saveOverlay(overlay);
    });
  },

  async getStaff(): Promise<StaffMember[]> {
    return [{ id: "local-dev", email: "local@dev", name: "Local preview (no auth)", role: "owner" }];
  },
};
