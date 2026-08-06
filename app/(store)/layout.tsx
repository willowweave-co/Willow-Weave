import { repo } from "@/lib/data";
import { DEFAULT_ANNOUNCEMENT_COLOR, announcementTextColor } from "@/lib/announcement";
import { resolveNav } from "@/components/store/nav-data";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SearchCommand } from "@/components/store/search-command";
import { TrafficBeacon } from "@/components/store/traffic-beacon";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [collections, settings, navConfig] = await Promise.all([
    repo.getCollections(),
    repo.getSettings(),
    repo.getNavConfig(),
  ]);
  // null config = follow the collections automatically, exactly as the header
  // did before it became editable
  const nav = resolveNav(collections, navConfig);

  return (
    <div className="flex min-h-dvh flex-col">
      {settings.announcement && (
        <p
          className="px-4 py-2 text-center text-xs font-medium tracking-wide"
          style={{
            backgroundColor: settings.announcementColor ?? DEFAULT_ANNOUNCEMENT_COLOR,
            color: announcementTextColor(settings.announcementColor ?? DEFAULT_ANNOUNCEMENT_COLOR),
          }}
        >
          {settings.announcement}
        </p>
      )}
      <Header nav={nav} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer freeShippingThreshold={settings.freeShippingThreshold} />
      <SearchCommand />
      <TrafficBeacon />
    </div>
  );
}
