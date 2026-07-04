import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only. Used exclusively for:
 *  - inviting staff members (auth admin API)
 *  - the keepalive cron route
 * Never import from client components.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
