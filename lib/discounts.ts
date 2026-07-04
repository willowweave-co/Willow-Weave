import type { DiscountCode } from "@/lib/types";

/**
 * Discount validation shared by the local adapter and cart preview.
 * (The Supabase place_order RPC re-implements the same rules server-side.)
 */
export function validateDiscount(
  d: DiscountCode | undefined | null,
  subtotal: number,
  now = new Date()
): { valid: boolean; amount: number } {
  if (!d || !d.active) return { valid: false, amount: 0 };
  if (d.startsAt && now < new Date(d.startsAt)) return { valid: false, amount: 0 };
  if (d.endsAt && now > new Date(d.endsAt)) return { valid: false, amount: 0 };
  if (d.usageLimit != null && d.timesUsed >= d.usageLimit) return { valid: false, amount: 0 };
  if (subtotal < d.minSubtotal) return { valid: false, amount: 0 };
  const amount =
    d.type === "percent" ? Math.round((subtotal * d.value) / 100) : Math.min(d.value, subtotal);
  return { valid: true, amount };
}

export const MAX_ITEM_QTY = 20;
