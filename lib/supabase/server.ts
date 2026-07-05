import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request-scoped Supabase client for Server Components / Server Actions /
 * Route Handlers. Carries the visitor's auth session (anon for shoppers,
 * staff session inside /admin) so RLS does the authorization.
 *
 * When there is NO request context — `generateStaticParams`, static sitemap
 * generation, or any other build-time call — `cookies()` throws. There we fall
 * back to a cookieless anonymous client, which is exactly right: those paths
 * only read the public (published) catalog, never a logged-in session.
 */
export async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  try {
    cookieStore = await cookies();
  } catch {
    return createServerClient(url, anon, {
      cookies: { getAll: () => [], setAll: () => {} },
    });
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — session refresh is handled by middleware.
        }
      },
    },
  });
}
