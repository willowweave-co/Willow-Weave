import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAdminUser } from "@/lib/admin-auth";
import { dataMode } from "@/lib/data";
import { THEME_IMAGES } from "@/lib/content";
import { AdminNav, AdminSignOut } from "@/components/admin/admin-nav";
import { OrderWatcher } from "@/components/admin/order-watcher";
import { IdleLogout } from "@/components/admin/idle-logout";
import { FlaskConical } from "lucide-react";

export const metadata: Metadata = {
  title: { default: "Dashboard · Willow Weave", template: "%s · WW Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();

  // No user AND no Supabase to sign in against = a production deploy missing
  // its env vars. There is nothing to authenticate against, so serve nothing —
  // don't fall through to the dashboard on local JSON. (proxy.ts already
  // redirects here; this is the belt to its braces, in case middleware is
  // bypassed.)
  if (!user && dataMode === "local") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ivory px-4">
        <p className="max-w-sm text-center text-sm leading-relaxed text-bark">
          The dashboard is unavailable: this deployment has no database configured.
        </p>
      </div>
    );
  }

  // /admin/login renders without the chrome (proxy.ts already redirects
  // signed-out users there in Supabase mode)
  if (!user) {
    return <div className="min-h-dvh bg-ivory">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh bg-ivory">
      {/* live "new order" toasts + auto-refresh on every dashboard page */}
      <OrderWatcher />
      {/* auto sign-out after 30 min of inactivity (real auth only) */}
      {!user.localMode && <IdleLogout />}
      {/* sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-parchment/40 md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <Image src={THEME_IMAGES.logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          <span>
            <span className="heading-display block text-[0.95rem] leading-tight font-semibold text-ink">
              Willow Weave
            </span>
            <span className="text-[0.65rem] tracking-[0.18em] text-umber uppercase">
              Dashboard
            </span>
          </span>
        </Link>
        <AdminNav role={user.role} />
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-xs font-medium text-ink">{user.name}</p>
          <p className="truncate text-[0.7rem] text-umber">
            {user.email} · {user.role}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <Link href="/" className="text-xs text-walnut hover:underline">
              View store ↗
            </Link>
            {!user.localMode && <AdminSignOut />}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {user.localMode && (
          <div className="no-print flex items-center justify-center gap-2 bg-gold/25 px-4 py-2 text-center text-xs text-walnut-dark">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" />
            Local preview mode — no sign-in required, data lives in{" "}
            <code className="rounded bg-white/60 px-1">data/dev/</code>. Connect Supabase for real
            auth &amp; production data.
          </div>
        )}
        {/* mobile top bar */}
        <div className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ivory/95 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/admin" className="heading-display font-semibold text-ink">
            WW Dashboard
          </Link>
          <AdminNav role={user.role} mobile />
        </div>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
