import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SearchX, FileText, Layers } from "lucide-react";
import { searchSite } from "@/lib/search-server";
import { repo } from "@/lib/data";
import { ProductGrid } from "@/components/store/product-card";
import { HomeSearch } from "@/components/home/home-search";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query.length >= 2 ? await searchSite(query, 30) : [];

  const productHandles = results
    .filter((r) => r.type === "product")
    .map((r) => r.url.replace("/products/", ""));
  const allProducts = await repo.getProducts();
  const productHits = productHandles
    .map((h) => allProducts.find((p) => p.handle === h))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const collectionHits = results.filter((r) => r.type === "collection");
  const pageHits = results.filter((r) => r.type === "page");

  return (
    <div className="container-site py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">Search</p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink">
          {query ? <>Results for “{query}”</> : "Search the store"}
        </h1>
        <p className="mt-2 text-sm text-umber">
          {query
            ? `${results.length} ${results.length === 1 ? "match" : "matches"} across products, collections and pages`
            : "Find products, fabrics, collections, size charts and policies."}
        </p>
      </header>

      <div className="mb-10 max-w-2xl">
        <HomeSearch />
      </div>

      {query && results.length === 0 && (
        <div className="rounded-2xl border border-line bg-parchment/50 py-20 text-center">
          <SearchX className="mx-auto h-8 w-8 text-umber" />
          <p className="heading-display mt-3 text-xl text-ink">Nothing found for “{query}”</p>
          <p className="mt-1.5 text-sm text-umber">
            Check the spelling, or try a fabric (“chiffon”), a piece (“3-piece”) or “size chart”.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block font-medium text-walnut hover:underline hover:underline-offset-4"
          >
            Browse all products
          </Link>
        </div>
      )}

      {productHits.length > 0 && (
        <section className="mb-12">
          <h2 className="heading-display mb-5 text-xl font-semibold text-ink">
            Products <span className="text-sm font-normal text-umber">({productHits.length})</span>
          </h2>
          <ProductGrid products={productHits} />
        </section>
      )}

      {collectionHits.length > 0 && (
        <section className="mb-12">
          <h2 className="heading-display mb-5 text-xl font-semibold text-ink">
            Collections{" "}
            <span className="text-sm font-normal text-umber">({collectionHits.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {collectionHits.map((c) => (
              <Link
                key={c.url}
                href={c.url}
                className="group relative block overflow-hidden rounded-xl bg-linen"
              >
                <div className="relative aspect-[4/3]">
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Layers className="h-6 w-6 text-umber" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
                  <p className="heading-display absolute right-3 bottom-2.5 left-3 text-[0.95rem] leading-tight font-semibold text-ivory">
                    {c.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {pageHits.length > 0 && (
        <section>
          <h2 className="heading-display mb-5 text-xl font-semibold text-ink">
            Pages & Guides{" "}
            <span className="text-sm font-normal text-umber">({pageHits.length})</span>
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white/50">
            {pageHits.map((p) => (
              <li key={p.url}>
                <Link
                  href={p.url}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-linen/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-parchment">
                    <FileText className="h-4.5 w-4.5 text-umber" />
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{p.title}</span>
                    {p.subtitle && <span className="block text-xs text-umber">{p.subtitle}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
