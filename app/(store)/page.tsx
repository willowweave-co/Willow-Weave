import Link from "next/link";
import { ArrowRight, Ruler } from "lucide-react";
import { repo } from "@/lib/data";
import { getContent, HOME } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { SizeChartTable } from "@/components/store/size-chart-table";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { CollectionsShowcase } from "@/components/home/collections-showcase";

export const revalidate = 600;

export default async function HomePage() {
  const [products, collections, content, heroSlides, sizeCharts] = await Promise.all([
    repo.getProducts(),
    repo.getCollections(),
    getContent(),
    repo.getHeroSlides(),
    repo.getSizeCharts(),
  ]);
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const slides = heroSlides.filter((s) => s.enabled);
  const trending = HOME.trendingHandles
    .map((h) => byHandle.get(h))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const catalogPreview = products.slice(0, 8);

  return (
    <div>
      {/* ── Hero slideshow (managed in Admin → Homepage) ─────────────────── */}
      {slides.length > 0 ? (
        <HeroSlideshow slides={slides} />
      ) : (
        // keep an h1 for SEO even if every slide is switched off
        <h1 className="sr-only">Willow Weave</h1>
      )}

      {/* ── Trending ─────────────────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="container-site mt-8 md:mt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">
                Most loved right now
              </p>
              <h2 className="heading-display mt-1 text-2xl font-semibold text-ink sm:text-3xl">
                {content.home.heroHeadings.trending}
              </h2>
            </div>
            <Link
              href="/products"
              className="hidden items-center gap-1.5 text-sm font-medium text-walnut hover:underline hover:underline-offset-4 sm:flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* scroll-pl keeps snapped cards off the screen edge on mobile */}
          <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} className="w-[62vw] shrink-0 snap-start sm:w-auto" />
            ))}
          </div>
        </section>
      )}

      {/* ── Collections showcase ─────────────────────────────────────────── */}
      <CollectionsShowcase collections={collections} />

      {/* ── Catalog preview ──────────────────────────────────────────────── */}
      <section className="container-site mt-14 md:mt-20">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">
            Browse our catalog
          </p>
          <h2 className="heading-display mt-1 text-2xl font-semibold text-ink sm:text-3xl">
            Every piece, one place
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {catalogPreview.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button href="/products" size="lg">
            View all {products.length} products <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Size chart explainer — last stop before the footer ───────────── */}
      <section className="container-site mt-14 md:mt-20">
        <div className="grid items-center gap-8 rounded-2xl border border-line bg-parchment/60 p-7 sm:p-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-umber uppercase">
              <Ruler className="h-4 w-4" /> {content.home.sizeChartSection.heading}
            </p>
            <div
              className="rte mt-3 max-w-xl"
              dangerouslySetInnerHTML={{ __html: content.home.sizeChartSection.bodyHtml }}
            />
            <div className="mt-5">
              <Button href="/size-guide" variant="outline">
                Open the Size Guide <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* the real charts, not a picture of them */}
          <div className="min-w-0 space-y-6">
            {sizeCharts.map((chart) => (
              <div key={chart.id} className="min-w-0">
                <p className="mb-2 text-sm font-semibold text-ink">{chart.name}</p>
                <SizeChartTable chart={chart} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
