import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ProductGrid } from "@/components/store/product-card";
import { FiltersPanel } from "@/components/store/filters-panel";
import { SortSelect } from "@/components/store/sort-select";
import { applyFilters, buildFacets, parseFilters } from "@/lib/catalog-filters";
import { Button } from "@/components/ui/button";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "All Products",
  description:
    "The complete Willow Weave catalog — 2-piece and 3-piece suits, tops and trousers in lawn, silk, chiffon, velvet and more. Filter by fabric, size, colour and price.",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [products, collections] = await Promise.all([
    repo.getProducts(),
    repo.getCollections(),
  ]);

  const filters = parseFilters(sp);
  const facets = buildFacets(products, collections);
  const filtered = applyFilters(products, collections, filters);

  const activeCollection = filters.collection
    ? collections.find((c) => c.handle === filters.collection)
    : null;

  return (
    <div className="container-site py-8 md:py-10">
      <header className="mb-7">
        <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">The catalog</p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          {activeCollection ? activeCollection.title : "All Products"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-umber">
          Every piece in one place — filter by collection, fabric, size, colour and price.
        </p>
      </header>

      <div className="flex gap-8">
        <FiltersPanel facets={facets} resultCount={filtered.length} />

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-umber">
              {filtered.length} of {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
            <SortSelect current={filters.sort} />
          </div>

          {filtered.length ? (
            <ProductGrid
              products={filtered}
              priorityCount={4}
              className="lg:grid-cols-3 xl:grid-cols-4"
            />
          ) : (
            <div className="rounded-2xl border border-line bg-parchment/50 py-20 text-center">
              <p className="heading-display text-xl text-ink">No pieces match those filters</p>
              <p className="mt-1.5 text-sm text-umber">
                Try removing a filter or two — or browse the full catalog.
              </p>
              <div className="mt-5">
                <Button href="/products" variant="outline">
                  Clear filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
