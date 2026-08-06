import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { repo } from "@/lib/data";
import { EDITABLE_PAGES } from "@/lib/site-pages";
import { defaultNavConfig } from "@/components/store/nav-data";
import { NavMenuManager } from "@/components/admin/nav-menu-manager";

export const metadata = { title: "Store front · Menu" };

export default async function AdminStorefrontNavPage() {
  const [collections, saved] = await Promise.all([
    repo.getCollections({ includeUnpublished: true }),
    repo.getNavConfig(),
  ]);

  // With no saved menu the editor opens on the automatic one, so the owner is
  // editing what they can actually see rather than a blank slate.
  const initial = saved?.length ? saved : defaultNavConfig(collections);

  const linkOptions = [
    { label: "Home", href: "/" },
    { label: "All products", href: "/products" },
    { label: "All collections", href: "/collections" },
    ...collections
      .filter((c) => c.published)
      .map((c) => ({ label: `Collection: ${c.title}`, href: `/collections/${c.handle}` })),
    { label: "Size Guide", href: "/size-guide" },
    ...EDITABLE_PAGES.map((p) => ({ label: p.label, href: p.path })),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/storefront"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
        >
          <ArrowLeft className="h-4 w-4" /> Store front
        </Link>
        <h1 className="heading-display text-2xl font-semibold text-ink">Header menu</h1>
        <p className="mt-1 text-sm text-umber">
          The buttons and dropdowns along the top of the store. Rename them, reorder them with
          the arrows, hide one temporarily with the eye, or remove it altogether. The phone
          menu follows the same arrangement.
        </p>
      </div>

      <NavMenuManager
        initial={initial}
        isCustom={!!saved?.length}
        linkOptions={linkOptions}
      />
    </div>
  );
}
