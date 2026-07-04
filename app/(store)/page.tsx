import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Ruler } from "lucide-react";
import { repo } from "@/lib/data";
import { getContent, HOME, THEME_IMAGES } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { HomeSearch } from "@/components/home/home-search";
import { CollectionsShowcase } from "@/components/home/collections-showcase";

export const revalidate = 600;

export default async function HomePage() {
  const [products, collections, content] = await Promise.all([
    repo.getProducts(),
    repo.getCollections(),
    getContent(),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const heroCollection = collections.find((c) => c.handle === HOME.heroCollectionHandle);
  const featured = collections.find((c) => c.handle === HOME.featuredCollectionHandle);
  const featuredProducts = (featured?.productIds ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .slice(0, 8);
  const trending = HOME.trendingHandles
    .map((h) => byHandle.get(h))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const catalogPreview = products.slice(0, 8);

  return (
    <div>
      {/* ── Hero: New Arrivals / Bestsellers ─────────────────────────────── */}
      <section className="container-site grid gap-4 pt-4 md:grid-cols-2 md:pt-6">
        <Link
          href={heroCollection ? `/collections/${heroCollection.handle}` : "/products"}
          className="group relative block overflow-hidden rounded-2xl"
        >
          <div className="relative aspect-[4/5] sm:aspect-[3/3.2]">
            <Image
              src={THEME_IMAGES.heroNewArrivals}
              alt="New arrivals — Eid Ul Adha 2026 collection"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-6 sm:p-8">
              <p className="text-xs font-medium tracking-[0.2em] text-ivory/80 uppercase">
                {heroCollection?.title ?? "Latest drop"}
              </p>
              <h1 className="heading-display mt-1 text-3xl font-semibold text-ivory sm:text-4xl">
                {content.home.heroHeadings.newArrivals}
              </h1>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-sm font-medium text-ink transition-colors group-hover:bg-gold group-hover:text-ink">
                Shop now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        <Link href={HOME.bestsellersHref} className="group relative block overflow-hidden rounded-2xl">
          <div className="relative aspect-[4/5] sm:aspect-[3/3.2]">
            <Image
              src={THEME_IMAGES.heroBestsellers}
              alt="Bestselling pieces from Willow Weave"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-6 sm:p-8">
              <p className="text-xs font-medium tracking-[0.2em] text-ivory/80 uppercase">
                Customer favourites
              </p>
              <h2 className="heading-display mt-1 text-3xl font-semibold text-ivory sm:text-4xl">
                {content.home.heroHeadings.bestsellers}
              </h2>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-sm font-medium text-ink transition-colors group-hover:bg-gold group-hover:text-ink">
                Shop now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <section className="container-site mt-10 md:mt-14">
        <HomeSearch />
      </section>

      {/* ── Featured collection: Sun Kissed Threads ──────────────────────── */}
      {featured && featuredProducts.length > 0 && (
        <section className="container-site mt-14 md:mt-20">
          <div className="relative overflow-hidden rounded-2xl">
            <div className="relative aspect-[16/7] min-h-56">
              <Image
                src={THEME_IMAGES.heroFeatured}
                alt={featured.title}
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/65 via-ink/25 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-7 sm:p-12">
                <p className="text-xs font-medium tracking-[0.2em] text-gold uppercase">
                  Volume 5 — the latest chapter
                </p>
                <h2 className="heading-display mt-2 max-w-md text-3xl font-semibold text-ivory sm:text-5xl">
                  {content.home.heroHeadings.featured}
                </h2>
                <div className="mt-5">
                  <Button href={`/collections/${featured.handle}`} variant="gold" size="lg">
                    Explore the collection <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {featuredProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Trending ─────────────────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="container-site mt-14 md:mt-20">
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
          <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} className="w-[62vw] shrink-0 snap-start sm:w-auto" />
            ))}
          </div>
        </section>
      )}

      {/* ── Collections showcase ─────────────────────────────────────────── */}
      <CollectionsShowcase collections={collections} />

      {/* ── Size chart explainer (exact copy from the store) ─────────────── */}
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
          <div className="relative overflow-hidden rounded-xl border border-line bg-white">
            <Image
              src={THEME_IMAGES.sizeCharts}
              alt="Willow Weave size charts for tops and trousers"
              width={720}
              height={705}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

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
    </div>
  );
}
