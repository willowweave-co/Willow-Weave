import type { Collection, Product } from "@/lib/types";
import { productPriceRange } from "@/components/store/product-card";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Alphabetical" },
];

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "newest":
      return list.sort(
        (a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime()
      );
    case "price-asc":
      return list.sort((a, b) => productPriceRange(a).min - productPriceRange(b).min);
    case "price-desc":
      return list.sort((a, b) => productPriceRange(b).min - productPriceRange(a).min);
    case "name":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list;
  }
}

export interface CatalogFilters {
  collection?: string; // handle
  fabrics: string[];
  types: string[];
  sizes: string[];
  colors: string[];
  onSale: boolean;
  inStock: boolean;
  min?: number;
  max?: number;
  sort: SortKey;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const list = (key: string): string[] => {
    const v = sp[key];
    if (!v) return [];
    return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
  };
  const numOr = (key: string): number | undefined => {
    const v = Number(Array.isArray(sp[key]) ? sp[key]?.[0] : sp[key]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  return {
    collection: typeof sp.collection === "string" ? sp.collection : undefined,
    fabrics: list("fabric"),
    types: list("type"),
    sizes: list("size"),
    colors: list("color"),
    onSale: sp.sale === "1",
    inStock: sp.stock === "1",
    min: numOr("min"),
    max: numOr("max"),
    sort: (typeof sp.sort === "string" ? sp.sort : "featured") as SortKey,
  };
}

export function applyFilters(
  products: Product[],
  collections: Collection[],
  f: CatalogFilters
): Product[] {
  let list = products;

  if (f.collection) {
    const c = collections.find((x) => x.handle === f.collection);
    if (c) {
      const ids = new Set(c.productIds);
      list = list.filter((p) => ids.has(p.id));
    }
  }
  if (f.fabrics.length) {
    const wanted = new Set(f.fabrics.map((x) => x.toLowerCase()));
    list = list.filter((p) => p.fabrics.some((fab) => wanted.has(fab.toLowerCase())));
  }
  if (f.types.length) {
    const wanted = new Set(f.types.map((x) => x.toLowerCase()));
    list = list.filter((p) => wanted.has(p.productType.toLowerCase()));
  }
  if (f.sizes.length) {
    const wanted = new Set(f.sizes.map((s) => s.toUpperCase()));
    list = list.filter((p) =>
      p.variants.some((v) => v.size && wanted.has(v.size.toUpperCase()) && v.stock > 0)
    );
  }
  if (f.colors.length) {
    const wanted = new Set(f.colors.map((x) => x.toLowerCase()));
    list = list.filter((p) =>
      p.variants.some((v) => v.color && wanted.has(v.color.toLowerCase()))
    );
  }
  if (f.onSale) {
    list = list.filter((p) => p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price));
  }
  if (f.inStock) {
    list = list.filter((p) => p.variants.some((v) => v.stock > 0));
  }
  if (f.min != null) list = list.filter((p) => productPriceRange(p).min >= f.min!);
  if (f.max != null) list = list.filter((p) => productPriceRange(p).min <= f.max!);

  return sortProducts(list, f.sort);
}

export interface FacetData {
  collections: { handle: string; title: string; group: string }[];
  fabrics: string[];
  types: string[];
  sizes: string[];
  colors: string[];
  priceMin: number;
  priceMax: number;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export function buildFacets(products: Product[], collections: Collection[]): FacetData {
  const fabrics = new Set<string>();
  const types = new Set<string>();
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let priceMin = Infinity;
  let priceMax = 0;

  for (const p of products) {
    p.fabrics.forEach((f) => fabrics.add(f));
    if (p.productType) types.add(p.productType);
    for (const v of p.variants) {
      if (v.size) sizes.add(v.size.toUpperCase());
      if (v.color) colors.add(v.color);
      priceMin = Math.min(priceMin, v.price);
      priceMax = Math.max(priceMax, v.price);
    }
  }

  return {
    collections: collections
      .filter((c) => c.published && c.productIds.length > 0)
      .map((c) => ({ handle: c.handle, title: c.title, group: c.group })),
    fabrics: [...fabrics].sort(),
    types: [...types].sort(),
    sizes: [...sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    colors: [...colors].sort(),
    priceMin: priceMin === Infinity ? 0 : priceMin,
    priceMax,
  };
}
