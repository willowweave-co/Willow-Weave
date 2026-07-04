import { dataMode } from "@/lib/data";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
  /** true when running without Supabase (local preview, no real auth) */
  localMode: boolean;
}

/**
 * Resolves the current admin user, or null when not signed in / not staff.
 * In local mode (no Supabase configured) returns a synthetic owner so the
 * dashboard is fully previewable before any accounts exist.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  if (dataMode === "local") {
    return {
      id: "local-dev",
      email: "local@preview",
      name: "Local preview",
      role: "owner",
      localMode: true,
    };
  }
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    name: profile.name || user.email || "Staff",
    role: profile.role === "owner" ? "owner" : "staff",
    localMode: false,
  };
}

/** Throws unless the caller is signed-in staff (used by every admin action). */
export async function requireStaff(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireOwner(): Promise<AdminUser> {
  const user = await requireStaff();
  if (user.role !== "owner") throw new Error("FORBIDDEN");
  return user;
}
