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
import { ogImage, stripHtml } from "@/lib/utils";

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
      {/* banner — full-bleed like the homepage hero: runs under the
          translucent header and melts into the page. Deliberately shorter
          so the products keep the focus. */}
      <section className="relative -mt-14 h-64 w-full overflow-hidden sm:h-72 md:-mt-16 md:h-80">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-parchment to-sand" />
        )}
        <BottomMelt />
      </section>

      {/* title block sits in the melt zone below the image — in normal flow,
          so it can never cover the banner or get clipped on small screens */}
      <div className="container-site relative z-20 -mt-16 sm:-mt-20 md:-mt-24">
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
