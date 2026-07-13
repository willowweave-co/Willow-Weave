"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { repo, dataMode } from "@/lib/data";
import type {
  Collection,
  DiscountCode,
  HeroSlide,
  OrderStatus,
  Product,
  SizeChart,
  StoreSettings,
} from "@/lib/types";
import { requireStaff, requireOwner } from "@/lib/admin-auth";
import { sendStatusEmail } from "@/lib/email";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

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

/** Clamp a focal-point coordinate to 0–100%; anything else means "centre" (null). */
function pct(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(100, Math.max(0, Math.round(v)))
    : null;
}

/**
 * "Column/table does not exist" — a recent migration hasn't been run yet.
 * Postgres reports 42703/42P01; PostgREST reports PGRST204/PGRST205 when the
 * column/table is missing from its schema cache.
 */
function missingColumns(e: unknown): ActionResult | null {
  const code = (e as { code?: string })?.code;
  if (!["42703", "42P01", "PGRST204", "PGRST205"].includes(code ?? "")) return null;
  return {
    ok: false,
    error:
      "The database needs a one-time update: run the newest files in supabase/migrations/ (0005–0007) in the Supabase SQL editor, then save again.",
  };
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
    const settings = await repo.getSettings();
    await sendStatusEmail(order, status, settings.notifyEmail || undefined);
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

/** Permanently removes an order (fake/bogus entries). Stock is NOT restocked. */
export async function deleteOrderAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.deleteOrder(id);
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
      images: product.images.map((img) => ({
        ...img,
        focalX: pct(img.focalX),
        focalY: pct(img.focalY),
      })),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return missingColumns(e) ?? fail(e);
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
      imageFocalX: pct(collection.imageFocalX),
      imageFocalY: pct(collection.imageFocalY),
      bannerFocalX: pct(collection.bannerFocalX),
      bannerFocalY: pct(collection.bannerFocalY),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return missingColumns(e) ?? fail(e);
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
    const c = settings.contact;
    await repo.saveSettings({
      ...settings,
      storeName: settings.storeName.trim() || "Willow Weave",
      notifyEmail: settings.notifyEmail.trim(),
      announcement: settings.announcement?.trim() || null,
      contact: {
        phone: c.phone.trim(),
        whatsapp: c.whatsapp.replace(/\D/g, ""),
        email: c.email.trim(),
        processingNote: c.processingNote.trim(),
        facebook: c.facebook.trim(),
        instagram: c.instagram.trim(),
        tiktok: c.tiktok.trim(),
      },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return missingColumns(e) ?? fail(e);
  }
}

const MAX_HERO_SLIDES = 8;

export async function saveHeroSlidesAction(slides: HeroSlide[]): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!Array.isArray(slides)) return { ok: false, error: "Invalid slides payload." };
    if (slides.length > MAX_HERO_SLIDES) {
      return { ok: false, error: `Keep it to ${MAX_HERO_SLIDES} slides or fewer.` };
    }
    const clean: HeroSlide[] = [];
    for (const [i, s] of slides.entries()) {
      const heading = s.heading?.trim() ?? "";
      const mediaUrl = s.mediaUrl?.trim() ?? "";
      const href = s.href?.trim() ?? "";
      if (!mediaUrl) return { ok: false, error: `Slide ${i + 1} is missing its image/video.` };
      if (!heading) return { ok: false, error: `Slide ${i + 1} needs a heading.` };
      if (!/^(\/|https?:\/\/)/.test(href)) {
        return {
          ok: false,
          error: `Slide ${i + 1} needs a link (e.g. /products or /collections/…).`,
        };
      }
      clean.push({
        id: s.id || `slide-${Date.now()}-${i}`,
        mediaType: s.mediaType === "video" ? "video" : "image",
        mediaUrl,
        focalX: pct(s.focalX),
        focalY: pct(s.focalY),
        eyebrow: s.eyebrow?.trim() ?? "",
        heading,
        href,
        ctaLabel: s.ctaLabel?.trim() ?? "",
        enabled: !!s.enabled,
      });
    }
    await repo.saveHeroSlides(clean);
    refresh();
    return { ok: true };
  } catch (e) {
    if ((e as { code?: string })?.code === "42703") {
      return {
        ok: false,
        error:
          "The database needs a one-time update: run supabase/migrations/0003_hero_slides.sql in the Supabase SQL editor, then save again.",
      };
    }
    return fail(e);
  }
}

/** Adjust just the tile focal point of a collection (from the homepage manager). */
export async function setCollectionTileFocusAction(
  id: string,
  x: number | null,
  y: number | null
): Promise<ActionResult> {
  try {
    await requireStaff();
    await repo.setCollectionTileFocus(id, pct(x), pct(y));
    refresh();
    return { ok: true };
  } catch (e) {
    return missingColumns(e) ?? fail(e);
  }
}

// ── Site pages ───────────────────────────────────────────────────────────────

export async function saveSitePageAction(
  handle: string,
  title: string,
  bodyHtml: string
): Promise<ActionResult> {
  try {
    await requireStaff();
    const { isEditablePage } = await import("@/lib/site-pages");
    if (!isEditablePage(handle)) return { ok: false, error: "Unknown page." };
    if (!title.trim()) return { ok: false, error: "The page needs a title." };
    await repo.saveSitePage({
      handle,
      title: title.trim(),
      bodyHtml: sanitizeHtml(bodyHtml),
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return missingColumns(e) ?? fail(e);
  }
}

const MAX_HOMEPAGE_COLLECTIONS = 6;

/** Curated homepage "The Collections" slots; pass [] to return to automatic picks. */
export async function saveHomepageCollectionsAction(ids: string[]): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!Array.isArray(ids)) return { ok: false, error: "Invalid payload." };
    const clean = ids.map((id) => String(id).trim()).filter(Boolean);
    if (clean.length > MAX_HOMEPAGE_COLLECTIONS) {
      return { ok: false, error: `Pick at most ${MAX_HOMEPAGE_COLLECTIONS} collections.` };
    }
    if (new Set(clean).size !== clean.length) {
      return { ok: false, error: "The same collection is picked twice — each slot needs a different one." };
    }
    await repo.saveHomepageCollections(clean.length ? clean : null);
    refresh();
    return { ok: true };
  } catch (e) {
    return missingColumns(e) ?? fail(e);
  }
}

export interface AccountUpdateInput {
  name: string;
  email: string;
  newPassword?: string;
}

/** Self-serve account settings for the signed-in staff member. */
export async function updateAccountAction(input: AccountUpdateInput): Promise<ActionResult> {
  try {
    const user = await requireStaff();
    if (user.localMode) {
      return { ok: false, error: "Account settings need Supabase — connect it first (see SETUP.md)." };
    }

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 1 || name.length > 80) {
      return { ok: false, error: "Please enter a display name (up to 80 characters)." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "That email address doesn't look right." };
    }
    if (input.newPassword && input.newPassword.length < 8) {
      return { ok: false, error: "The new password needs at least 8 characters." };
    }

    // password: through the user's own session
    if (input.newPassword) {
      const session = await createSupabaseServer();
      const { error } = await session.auth.updateUser({ password: input.newPassword });
      if (error) return { ok: false, error: `Couldn't change the password: ${error.message}` };
    }

    // email: service role applies it instantly (no confirmation round-trip);
    // safe because requireStaff() gates this action
    if (email !== user.email.toLowerCase()) {
      const admin = createSupabaseAdmin();
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: true,
      });
      if (error) return { ok: false, error: `Couldn't change the email: ${error.message}` };
    }

    // display name (+ keep profile email in sync); service role but pinned to own row
    {
      const admin = createSupabaseAdmin();
      const { error } = await admin.from("profiles").update({ name, email }).eq("id", user.id);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Team management ──────────────────────────────────────────────────────────
// No email round-trip: Supabase's built-in mailer doesn't reliably deliver
// invites on the free tier, so the owner creates the account directly and
// hands over a one-time temporary password. Members change it afterwards in
// Settings → Your account.

export type StaffActionResult = ActionResult & { tempPassword?: string };

const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateTempPassword(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join("");
  return `WW-${pick(4)}-${pick(4)}-${pick(4)}`;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Owners with a usable count guard — the store must always keep one. */
async function ownerCount(): Promise<number> {
  const admin = createSupabaseAdmin();
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "owner");
  return count ?? 0;
}

export async function createStaffAction(
  email: string,
  name: string,
  role: "owner" | "staff"
): Promise<StaffActionResult> {
  try {
    await requireOwner();
    if (dataMode === "local") {
      return { ok: false, error: "Team accounts need Supabase — connect it first (see SETUP.md)." };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!validEmail(cleanEmail)) return { ok: false, error: "That email address doesn't look right." };

    const admin = createSupabaseAdmin();
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (existingProfile) {
      return {
        ok: false,
        error: "Already a team member — use “Reset password” on their row instead.",
      };
    }

    const tempPassword = generateTempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
    });
    let userId = data.user?.id;
    if (error) {
      // auth user exists without a profile (e.g. a stale invite) — repair it
      if (/already.*registered/i.test(error.message)) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (!existing) return { ok: false, error: error.message };
        userId = existing.id;
        const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
        });
        if (upErr) return { ok: false, error: upErr.message };
      } else {
        return { ok: false, error: error.message };
      }
    }
    if (!userId) return { ok: false, error: "Account creation failed — please try again." };

    const { error: pErr } = await admin.from("profiles").upsert({
      id: userId,
      email: cleanEmail,
      name: name.trim() || cleanEmail,
      role,
    });
    if (pErr) return { ok: false, error: pErr.message };

    revalidatePath("/admin/settings");
    return { ok: true, tempPassword };
  } catch (e) {
    return fail(e);
  }
}

export async function resetStaffPasswordAction(userId: string): Promise<StaffActionResult> {
  try {
    await requireOwner();
    if (dataMode === "local") return { ok: false, error: "Needs Supabase." };
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return { ok: false, error: "No such team member." };

    const tempPassword = generateTempPassword();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, tempPassword };
  } catch (e) {
    return fail(e);
  }
}

export async function updateStaffRoleAction(
  userId: string,
  role: "owner" | "staff"
): Promise<ActionResult> {
  try {
    await requireOwner();
    if (dataMode === "local") return { ok: false, error: "Needs Supabase." };
    const admin = createSupabaseAdmin();
    const { data: target } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!target) return { ok: false, error: "No such team member." };
    if (target.role === "owner" && role === "staff" && (await ownerCount()) <= 1) {
      return { ok: false, error: "The store needs at least one owner." };
    }
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeStaffAction(userId: string): Promise<ActionResult> {
  try {
    const me = await requireOwner();
    if (dataMode === "local") return { ok: false, error: "Needs Supabase." };
    if (userId === me.id) {
      return { ok: false, error: "You can't remove your own account." };
    }
    const admin = createSupabaseAdmin();
    const { data: target } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!target) return { ok: false, error: "No such team member." };
    if (target.role === "owner" && (await ownerCount()) <= 1) {
      return { ok: false, error: "The store needs at least one owner." };
    }
    // deleting the auth user cascades to the profile row
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
