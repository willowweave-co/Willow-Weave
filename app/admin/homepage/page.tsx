import { repo } from "@/lib/data";
import { HeroSlidesManager } from "@/components/admin/hero-slides-manager";

export const metadata = { title: "Homepage" };

export default async function AdminHomepagePage() {
  const [slides, collections] = await Promise.all([
    repo.getHeroSlides(),
    repo.getCollections(),
  ]);

  const linkOptions = [
    { label: "All products", href: "/products" },
    ...collections.map((c) => ({ label: c.title, href: `/collections/${c.handle}` })),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="heading-display text-2xl font-semibold text-ink">Homepage</h1>
        <p className="mt-1 text-sm text-umber">
          The hero slideshow at the top of the store — collections, deals and campaigns. Slides
          rotate automatically; images and videos both work.
        </p>
      </header>

      <HeroSlidesManager initial={slides} linkOptions={linkOptions} />
    </div>
  );
}
