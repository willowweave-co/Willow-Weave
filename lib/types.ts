// ── Domain types shared by storefront, admin, and both data adapters ────────

export type CollectionGroup = "volumes" | "occasions" | "pieces" | "fabrics";

export interface Collection {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  image: string | null;
  /** Tile focus (homepage tiles + collections index cards), % from left/top; null/absent = centre. */
  imageFocalX?: number | null;
  imageFocalY?: number | null;
  /** Banner focus (the wide banner on the collection's own page); null/absent = centre. */
  bannerFocalX?: number | null;
  bannerFocalY?: number | null;
  group: CollectionGroup;
  position: number;
  featured: boolean;
  published: boolean;
  /** ordered product ids (collection curation order) */
  productIds: string[];
}

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
  /** Focal point kept in view when the storefront crops, % from left/top; null/absent = centre. */
  focalX?: number | null;
  focalY?: number | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  size: string | null;
  color: string | null;
  price: number; // PKR, whole rupees
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  position: number;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  productType: string;
  fabrics: string[];
  tags: string[];
  vendor: string;
  publishedAt: string | null; // null = hidden from storefront
  createdAt: string;
  options: { name: string; values: string[] }[];
  images: ProductImage[];
  variants: ProductVariant[];
  sizeChartId: string | null;
  /** Transient: set by the admin product form to sync collection membership on save. */
  collectionIds?: string[];
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  handle: string;
  title: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  image: string | null;
}

export interface Order {
  id: string;
  orderNumber: string; // WW-1001…
  status: OrderStatus;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  notes: string | null;
  paymentMethod: "cod";
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  shippingFee: number;
  total: number;
  items: OrderItem[];
  internalNotes: string | null;
  statusHistory: { status: OrderStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  timesUsed: number;
  active: boolean;
}

export interface SizeChart {
  id: string;
  name: string;
  appliesTo: string;
  columns: string[];
  rows: string[][];
  note: string;
}

/** Site-wide contact details & social links — edited once in Settings, shown everywhere. */
export interface ContactSettings {
  /** Display phone, e.g. "+92 300 0535503" (also used for tel: links). */
  phone: string;
  /** WhatsApp number, digits only with country code, e.g. "923000535503". */
  whatsapp: string;
  email: string;
  /** The order-processing notice on the contact page. */
  processingNote: string;
  facebook: string;
  instagram: string;
  tiktok: string;
}

/** Matches the previously hard-coded values, so nothing changes until edited. */
export const DEFAULT_CONTACT: ContactSettings = {
  phone: "+92 300 0535503",
  whatsapp: "923000535503",
  email: "willowweave.co@gmail.com",
  processingNote:
    "Orders are processed within 1–3 business days (excluding weekends & public holidays).",
  facebook: "https://www.facebook.com/profile.php?id=61578804677834",
  instagram: "https://www.instagram.com/willowweave.co",
  tiktok: "https://www.tiktok.com/@willowweave.co?_t=ZS-8zrfDejv3g8&_r=1",
};

export interface StoreSettings {
  storeName: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  notifyEmail: string;
  announcement: string | null;
  contact: ContactSettings;
}

/** One slide of the homepage hero slideshow (admin-managed). */
export interface HeroSlide {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  /** Focal point of the media, % from left/top; null/absent = centre. */
  focalX?: number | null;
  focalY?: number | null;
  /** Small label above the heading, e.g. "Volume 5". Empty = hidden. */
  eyebrow: string;
  heading: string;
  /** Where the slide links to, e.g. /collections/eid-ul-adha-2026 */
  href: string;
  /** Button text; empty = hide the button (whole slide stays clickable). */
  ctaLabel: string;
  enabled: boolean;
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
}

export interface CartItem {
  productId: string;
  variantId: string;
  handle: string;
  title: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  image: string | null;
  quantity: number;
  /** stock known at add-time; revalidated at checkout */
  maxStock: number;
}

// ── Checkout payloads ────────────────────────────────────────────────────────

export interface CheckoutInput {
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  notes: string | null;
  discountCode: string | null;
  items: { variantId: string; productId: string; quantity: number }[];
}

export interface PlacedOrder {
  orderNumber: string;
  total: number;
}

// ── Search ───────────────────────────────────────────────────────────────────

export type SearchDocType = "product" | "collection" | "page";

export interface SearchResult {
  type: SearchDocType;
  title: string;
  url: string;
  subtitle: string | null;
  image: string | null;
  price: number | null;
  compareAtPrice: number | null;
  score: number;
}

// ── Dashboard stats ──────────────────────────────────────────────────────────

export interface SalesStats {
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  ordersToday: number;
  orders7d: number;
  orders30d: number;
  pendingOrders: number;
  byStatus: Record<OrderStatus, number>;
  /** last 30 days, oldest first */
  revenueSeries: { date: string; revenue: number; orders: number }[];
  topProducts: { title: string; handle: string; units: number; revenue: number }[];
  lowStock: { productTitle: string; handle: string; variantLabel: string; stock: number }[];
}
