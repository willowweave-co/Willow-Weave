import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { repo } from "@/lib/data";
import { EDITABLE_PAGES } from "@/lib/site-pages";
import { HeroSlidesManager } from "@/components/admin/hero-slides-manager";

export const metadata = { title: "Homepage · Hero" };

export default async function AdminHomepageHeroPage() {
  const [slides, intervalMs, collections] = await Promise.all([
    repo.getHeroSlides(),
    repo.getHeroIntervalMs(),
    repo.getCollections(),
  ]);

  const linkOptions = [
    { label: "Home", href: "/" },
    { label: "All products", href: "/products" },
    { label: "All collections", href: "/collections" },
    ...collections.map((c) => ({
      label: `Collection: ${c.title}`,
      href: `/collections/${c.handle}`,
    })),
    { label: "Size Guide", href: "/size-guide" },
    ...EDITABLE_PAGES.map((p) => ({ label: p.label, href: p.path })),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/homepage"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
        >
          <ArrowLeft className="h-4 w-4" /> Homepage sections
        </Link>
        <h1 className="heading-display text-2xl font-semibold text-ink">Hero slideshow</h1>
        <p className="mt-1 text-sm text-umber">
          The rotating banner at the very top of the store — collections, deals and campaigns.
          Pick where each slide&rsquo;s button leads from the &ldquo;Links to&rdquo; dropdown.
        </p>
      </div>

      <HeroSlidesManager
        initial={slides}
        initialIntervalMs={intervalMs}
        linkOptions={linkOptions}
      />
    </div>
  );
}
