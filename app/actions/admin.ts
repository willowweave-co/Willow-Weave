"use server";

import { revalidatePath } from "next/cache";
import { repo, dataMode } from "@/lib/data";
import type {
  Collection,
  DiscountCode,
  OrderStatus,
  Product,
  SizeChart,
  StoreSettings,
} from "@/lib/types";
import { requireStaff, requireOwner } from "@/lib/admin-auth";
import { sendStatusEmail } from "@/lib/email";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "UNAUTHORIZED") return { ok: false, error: "You must be signed in." };
  if (msg === "FORBIDDEN") return { ok: false, error: "Only the owner can do that." };
  console.error("Admin action failed:", msg);
  return { ok: false, error: "Something went wrong — please try again." };
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Strip scripts/handlers from owner-entered rich text. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus
): Promise<ActionResult> {
  try {
    await requireStaff();
    const order = await repo.updateOrderStatus(id, status);
    if (!order) return { ok: false, error: "Order not found." };
    await sendStatusEmail(order, status);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setOrderNotesAction(id: string, notes: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.setOrderInternalNotes(id, notes.slice(0, 2000));
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Products / inventory ─────────────────────────────────────────────────────

export async function saveProductAction(product: Product): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!product.title.trim()) return { ok: false, error: "The product needs a title." };
    if (!product.handle.trim()) return { ok: false, error: "The product needs a URL handle." };
    if (!product.variants.length)
      return { ok: false, error: "Add at least one variant (size/price)." };
    for (const v of product.variants) {
      if (!(v.price >= 0)) return { ok: false, error: "Every variant needs a valid price." };
    }
    await repo.saveProduct({
      ...product,
      title: product.title.trim(),
      handle: product.handle.trim().toLowerCase(),
      descriptionHtml: sanitizeHtml(product.descriptionHtml),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.deleteProduct(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setStockAction(
  productId: string,
  variantId: string,
  stock: number
): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!Number.isFinite(stock) || stock < 0 || stock > 100000) {
      return { ok: false, error: "Enter a valid stock amount." };
    }
    await repo.setVariantStock(productId, variantId, Math.floor(stock));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Collections ──────────────────────────────────────────────────────────────

export async function saveCollectionAction(collection: Collection): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!collection.title.trim()) return { ok: false, error: "The collection needs a title." };
    if (!collection.handle.trim()) return { ok: false, error: "The collection needs a handle." };
    await repo.saveCollection({
      ...collection,
      title: collection.title.trim(),
      handle: collection.handle.trim().toLowerCase(),
      descriptionHtml: sanitizeHtml(collection.descriptionHtml),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.deleteCollection(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Discounts ────────────────────────────────────────────────────────────────

export async function saveDiscountAction(discount: DiscountCode): Promise<ActionResult> {
  try {
    await requireStaff();
    const code = discount.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return { ok: false, error: "Codes are 3–40 letters/numbers (e.g. EID10)." };
    }
    if (!(discount.value > 0)) return { ok: false, error: "The discount value must be positive." };
    if (discount.type === "percent" && discount.value > 100) {
      return { ok: false, error: "A percentage discount can't exceed 100%." };
    }
    await repo.saveDiscount({ ...discount, code });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDiscountAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.deleteDiscount(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Size charts ──────────────────────────────────────────────────────────────

export async function saveSizeChartAction(chart: SizeChart): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!chart.name.trim()) return { ok: false, error: "The chart needs a name." };
    if (!chart.columns.length || !chart.rows.length) {
      return { ok: false, error: "Add at least one column and one row." };
    }
    const saved = await repo.saveSizeChart(chart);
    refresh();
    return { ok: true, id: saved.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSizeChartAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.deleteSizeChart(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Settings & staff ─────────────────────────────────────────────────────────

export async function saveSettingsAction(settings: StoreSettings): Promise<ActionResult> {
  try {
    await requireStaff();
    if (settings.shippingFee < 0) return { ok: false, error: "Shipping fee can't be negative." };
    await repo.saveSettings({
      ...settings,
      storeName: settings.storeName.trim() || "Willow Weave",
      notifyEmail: settings.notifyEmail.trim(),
      announcement: settings.announcement?.trim() || null,
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function inviteStaffAction(
  email: string,
  name: string,
  role: "owner" | "staff"
): Promise<ActionResult> {
  try {
    await requireOwner();
    if (dataMode === "local") {
      return {
        ok: false,
        error: "Staff invites need Supabase — connect it first (see SETUP.md).",
      };
    }
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/login`,
    });
    if (error) return { ok: false, error: error.message };
    const userId = data.user?.id;
    if (userId) {
      const { error: pErr } = await admin.from("profiles").upsert({
        id: userId,
        email: email.trim(),
        name: name.trim() || email.trim(),
        role,
      });
      if (pErr) return { ok: false, error: pErr.message };
    }
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
