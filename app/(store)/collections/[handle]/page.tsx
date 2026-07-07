import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { repo } from "@/lib/data";
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
      {/* banner */}
      <section className="container-site pt-4 md:pt-6">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="relative flex aspect-[16/6] min-h-44 items-end">
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
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/15 to-transparent" />
            <div className="relative p-6 sm:p-10">
              <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-ivory/75">
                <Link href="/" className="hover:text-ivory">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link href="/collections" className="hover:text-ivory">Collections</Link>
              </nav>
              <h1 className="heading-display text-3xl font-semibold text-ivory sm:text-4xl">
                {collection.title}
              </h1>
              {collection.descriptionHtml && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ivory/85">
                  {stripHtml(collection.descriptionHtml)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

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
