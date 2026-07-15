"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { repo, DATA_CACHE_TAG } from "@/lib/data";
import type { PlacedOrderDetails } from "@/lib/data";
import { sendOrderEmails } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { FALLBACK_RATES, isCurrencyCode } from "@/lib/currency";
import { getRates } from "@/lib/currency-server";

/** A real cart is a handful of lines; anything past this is an attempt to make
 *  place_order() loop. Quantity per line is capped separately (20). */
const MAX_CART_LINES = 50;

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{8,17}$/, "Please enter a valid phone number (e.g. 0300 1234567)"),
  email: z
    .string()
    .trim()
    .email("That email doesn't look right")
    .max(200)
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(10, "Please enter your complete delivery address").max(500),
  city: z.string().trim().min(2, "Please enter your city").max(80),
  country: z.string().trim().min(2, "Please pick your country").max(60).default("Pakistan"),
  paymentMethod: z.enum(["cod", "bank"]).default("cod"),
  /** Display currency for the label/receipt; the rate is looked up server-side. */
  currency: z.string().trim().max(3).default("PKR"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  discountCode: z.string().trim().max(40).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, "Your cart is empty")
    .max(MAX_CART_LINES, "That's too many different items for one order."),
});

export type CheckoutFormInput = z.input<typeof checkoutSchema>;

export interface CheckoutResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function friendlyOrderError(message: string): string {
  if (message.includes("INSUFFICIENT_STOCK")) {
    const [, title, size] = message.split(":");
    return `Not enough stock for “${title}”${size ? ` in size ${size}` : ""}. Please adjust the quantity in your cart.`;
  }
  if (message.includes("VARIANT_NOT_FOUND") || message.includes("PRODUCT_UNAVAILABLE")) {
    return "An item in your cart is no longer available. Please remove it and try again.";
  }
  if (message.includes("INVALID_DISCOUNT")) {
    return "That discount code isn't valid for this order.";
  }
  if (message.includes("EMPTY_CART")) return "Your cart is empty.";
  if (message.includes("BAD_QUANTITY")) return "One of the quantities looks wrong (max 20 per item).";
  if (message.includes("BAD_COUNTRY")) {
    return "We don't currently ship to that country — please pick another from the list.";
  }
  if (message.includes("BANK_UNAVAILABLE") || message.includes("BAD_PAYMENT_METHOD")) {
    return "Bank transfer isn't available right now — please choose Cash on Delivery.";
  }
  return "We couldn't place your order. Please try again in a moment.";
}

export async function placeOrderAction(raw: CheckoutFormInput): Promise<CheckoutResult> {
  // COD means an order costs the attacker nothing and us real stock — throttle
  // before doing any work.
  const limit = rateLimit(`order:${await clientIp()}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: "Too many orders from this device just now. Please wait a few minutes and try again.",
    };
  }

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  try {
    // display currency: never trust a client-sent rate — look it up here
    const currency = isCurrencyCode(data.currency) ? data.currency : "PKR";
    const displayRate =
      currency === "PKR" ? null : ((await getRates())[currency] ?? FALLBACK_RATES[currency]);

    const placed = await repo.placeOrder({
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || null,
      address: data.address,
      city: data.city,
      country: data.country || "Pakistan",
      paymentMethod: data.paymentMethod,
      currency,
      displayRate,
      notes: data.notes || null,
      discountCode: data.discountCode || null,
      items: data.items,
    });

    // Confirmation details travel via a short-lived, httpOnly cookie — the
    // confirmation page never exposes a guessable public order lookup.
    const [notifyEmail, settings, order] = await Promise.all([
      repo.getNotifyEmail(),
      repo.getSettings(),
      repo.getOrderByNumberTrusted(placed.orderNumber),
    ]);
    if (order) {
      const details: PlacedOrderDetails = {
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        phone: order.phone,
        email: order.email,
        address: order.address,
        city: order.city,
        country: order.country,
        paymentMethod: order.paymentMethod,
        currency: order.currency,
        displayTotal: order.displayTotal,
        subtotal: order.subtotal,
        discountCode: order.discountCode,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        total: order.total,
        items: order.items,
        createdAt: order.createdAt,
      };
      const cookieStore = await cookies();
      cookieStore.set("ww-last-order", JSON.stringify(details), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 30,
        path: "/",
      });
      await sendOrderEmails(order, notifyEmail, settings);
    }

    // stock changed → refresh cached storefront pages + cached repo reads
    revalidatePath("/", "layout");
    updateTag(DATA_CACHE_TAG); // stock counts feed "sold out" badges — expire now, not lazily

    return { ok: true, orderNumber: placed.orderNumber };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: friendlyOrderError(message) };
  }
}

export async function previewDiscountAction(
  code: string,
  subtotal: number
): Promise<{ valid: boolean; amount?: number; code?: string }> {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > 40 || !Number.isFinite(subtotal)) return { valid: false };

  // This endpoint answers "is this a real code?" — without a throttle the whole
  // code space is enumerable. A shopper types one or two codes; 10 per minute
  // is generous for them and useless for a brute-forcer.
  const limit = rateLimit(`discount:${await clientIp()}`, 10, 60_000);
  if (!limit.ok) return { valid: false };

  try {
    return await repo.previewDiscount(trimmed, subtotal);
  } catch {
    return { valid: false };
  }
}
