import { repo, dataMode } from "@/lib/data";
import { getAdminUser } from "@/lib/admin-auth";
import { SettingsForm, StaffManager } from "@/components/admin/settings-form";
import { AccountSettings } from "@/components/admin/account-settings";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [settings, staff, user] = await Promise.all([
    repo.getSettings(),
    repo.getStaff(),
    getAdminUser(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="heading-display text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-umber">
          Store-wide configuration — delivery charges, notifications and staff access.
        </p>
      </header>

      {user && (
        <AccountSettings
          currentName={user.name}
          currentEmail={user.email}
          role={user.role}
          localMode={user.localMode}
        />
      )}

      <SettingsForm initial={settings} />

      <StaffManager staff={staff} isOwner={user?.role === "owner"} localMode={dataMode === "local"} />

      <section className="rounded-2xl border border-line bg-white/60 p-5">
        <h2 className="font-semibold text-ink">Connection status</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-bark">Database (Supabase)</dt>
            <dd className={dataMode === "supabase" ? "font-medium text-moss" : "text-umber"}>
              {dataMode === "supabase" ? "Connected" : "Local files (data/dev/)"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-bark">Images (Cloudinary)</dt>
            <dd
              className={
                process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? "font-medium text-moss" : "text-umber"
              }
            >
              {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? "Connected" : "Not configured"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-bark">Email (Resend)</dt>
            <dd className={process.env.RESEND_API_KEY ? "font-medium text-moss" : "text-umber"}>
              {process.env.RESEND_API_KEY ? "Connected" : "Console log only"}
            </dd>
          </div>
        </dl>
        {dataMode === "local" && (
          <p className="mt-3 rounded-xl bg-parchment/70 px-3.5 py-2.5 text-xs leading-relaxed text-bark">
            Running in local preview. Follow <strong>SETUP.md</strong> to connect the free
            Supabase / Cloudinary / Resend accounts for production.
          </p>
        )}
      </section>
    </div>
  );
}
