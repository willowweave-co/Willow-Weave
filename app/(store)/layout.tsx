import { repo } from "@/lib/data";
import { buildNav } from "@/components/store/nav-data";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SearchCommand } from "@/components/store/search-command";
import { TrafficBeacon } from "@/components/store/traffic-beacon";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [collections, settings] = await Promise.all([
    repo.getCollections(),
    repo.getSettings(),
  ]);
  const nav = buildNav(collections);

  return (
    <div className="flex min-h-dvh flex-col">
      {settings.announcement && (
        <p className="bg-walnut px-4 py-2 text-center text-xs font-medium tracking-wide text-ivory">
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
