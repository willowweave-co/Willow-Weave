import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { repo } from "@/lib/data";
import { BottomMelt } from "@/components/store/bottom-melt";
import { ProductGrid } from "@/components/store/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { sortProducts, type SortKey } from "@/lib/catalog-filters";
import { focalCrop, ogImage, stripHtml } from "@/lib/utils";

export const revalidate = 600;

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateStaticParams() {
  const collections = await repo.getCollections();
  return collections.map((c) => ({ handle: c.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const collection = await repo.getCollectionByHandle(handle);
  if (!collection) return { title: "Collection not found" };
  const desc = stripHtml(collection.descriptionHtml);
  return {
    title: collection.title,
    description: desc || `Shop the ${collection.title} collection at Willow Weave.`,
    openGraph: collection.image ? { images: [ogImage(collection.image)] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ handle }, { sort }] = await Promise.all([params, searchParams]);
  const collection = await repo.getCollectionByHandle(handle);
  if (!collection || !collection.published) notFound();

  const all = await repo.getProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  const inCuratedOrder = collection.productIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const products = sortProducts(inCuratedOrder, (sort as SortKey) ?? "featured");

  return (
    <div>
      {/* Banner — full-bleed like the homepage hero: runs under the
          translucent header and melts into the page. Deliberately shorter
          so the products keep the focus.

          The heights carry the header's height inside them. Visible image =
          height − header, and the melt eats 192px of that from the bottom,
          so on desktop 336 − 80 − 192 leaves a 64px band of actual, crisp
          photograph. Grow the header and these have to grow with it or that
          band closes up and the banner reads as pure haze. */}
      <section className="relative -mt-16 h-[16.5rem] w-full overflow-hidden sm:h-[18.5rem] md:-mt-20 md:h-[21rem]">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={focalCrop(
              collection.bannerFocalX,
              collection.bannerFocalY,
              collection.bannerFocalZoom
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-parchment to-sand" />
        )}
        {/* shorter melt to match the shorter banner */}
        <BottomMelt className="h-40 md:h-48" />
      </section>

      {/* title block sits in the melt zone below the image — in normal flow,
          so it can never cover the banner or get clipped on small screens */}
      <div className="relative z-20 -mt-16 sm:-mt-20 md:-mt-24">
        {/* The melt is only ~30% opaque this high up, so the breadcrumb and
            title were landing on whatever the banner happened to be — pale
            fabric washed the brown text out, dark fabric swallowed it. This
            carries the ivory the rest of the way to solid behind the copy.
            The ramp is long and starts weak on purpose: a short, strong one
            reads as a hard horizontal edge sitting on top of the melt
            instead of continuing it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-14 bottom-0 bg-gradient-to-b from-transparent via-ivory/75 to-ivory"
        />
        <div className="container-site relative">
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-umber">
            <Link href="/" className="hover:text-ink">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/collections" className="hover:text-ink">Collections</Link>
          </nav>
          <h1 className="heading-display text-3xl font-semibold text-ink sm:text-4xl">
            {collection.title}
          </h1>
          {collection.descriptionHtml && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bark">
              {stripHtml(collection.descriptionHtml)}
            </p>
          )}
        </div>
      </div>

      <section className="container-site py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-umber">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
          <SortSelect current={(sort as SortKey) ?? "featured"} />
        </div>

        {products.length ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : (
          <div className="rounded-2xl border border-line bg-parchment/50 py-16 text-center">
            <p className="text-bark">This collection is being restocked.</p>
            <Link
              href="/products"
              className="mt-2 inline-block font-medium text-walnut hover:underline"
            >
              Browse all products
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
