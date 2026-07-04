export type {
  CheckoutInput,
  Collection,
  DiscountCode,
  Order,
  OrderItem,
  OrderStatus,
  PlacedOrder,
  Product,
  ProductImage,
  ProductVariant,
  SalesStats,
  SizeChart,
  StaffMember,
  StoreSettings,
} from "@/lib/types";

import type { Order } from "@/lib/types";

/** What the public order-confirmation page may see (no admin fields). */
export type PlacedOrderDetails = Pick<
  Order,
  | "orderNumber"
  | "status"
  | "customerName"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "subtotal"
  | "discountCode"
  | "discountAmount"
  | "shippingFee"
  | "total"
  | "items"
  | "createdAt"
>;
