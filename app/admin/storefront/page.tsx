import Link from "next/link";
import { GalleryHorizontalEnd, LayoutGrid, Menu, ChevronRight } from "lucide-react";
import { repo } from "@/lib/data";

export const metadata = { title: "Store front" };

export default async function AdminStorefrontPage() {
  const [slides, homepageCollections, navConfig] = await Promise.all([
    repo.getHeroSlides(),
    repo.getHomepageCollections(),
    repo.getNavConfig(),
  ]);
  const enabledSlides = slides.filter((s) => s.enabled).length;
  const navItems = navConfig?.filter((i) => !i.hidden).length ?? 0;

  const sections = [
    {
      href: "/admin/storefront/nav",
      icon: Menu,
      title: "Header menu",
      description:
        "The buttons and dropdowns across the top — rename, reorder, hide or remove them.",
      status: navItems ? `${navItems} items` : "Automatic",
    },
    {
      href: "/admin/storefront/hero",
      icon: GalleryHorizontalEnd,
      title: "Hero slideshow",
      description: "The rotating banner at the top — slides, headings, buttons and links.",
      status: `${enabledSlides} slide${enabledSlides === 1 ? "" : "s"} live`,
    },
    {
      href: "/admin/storefront/collections",
      icon: LayoutGrid,
      title: "“The Collections” grid",
      description: "Which collections show in the grid under the hero, and their image focus.",
      status: homepageCollections?.length
        ? `${homepageCollections.length} hand-picked`
        : "Automatic picks",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="heading-display text-2xl font-semibold text-ink">Store front</h1>
        <p className="mt-1 text-sm text-umber">
          Everything a shopper sees, managed one piece at a time — pick something to edit.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href as never}
            className="group flex flex-col rounded-2xl border border-line bg-white/60 p-5 transition-all hover:border-walnut/50 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-walnut/10">
              <s.icon className="h-5 w-5 text-walnut" />
            </span>
            <span className="mt-3 flex items-center gap-1 font-semibold text-ink">
              {s.title}
              <ChevronRight className="h-4 w-4 text-umber/60 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-umber">{s.description}</span>
            <span className="mt-3 inline-flex w-fit rounded-full bg-parchment px-2.5 py-1 text-xs font-medium text-bark">
              {s.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
