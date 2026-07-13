import { Plus } from "lucide-react";
import { repo } from "@/lib/data";
import { productPriceRange } from "@/components/store/product-card";
import { ProductsTable, type ProductRow } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const all = await repo.getProducts({ includeUnpublished: true });

  const rows: ProductRow[] = all.map((p) => {
    const { min, compareAt } = productPriceRange(p);
    return {
      id: p.id,
      title: p.title,
      image: p.images[0]?.src ?? null,
      focalX: p.images[0]?.focalX ?? null,
      focalY: p.images[0]?.focalY ?? null,
      productType: p.productType,
      fabrics: p.fabrics,
      tags: p.tags,
      minPrice: min,
      compareAt,
      stock: p.variants.reduce((n, v) => n + v.stock, 0),
      variantCount: p.variants.length,
      published: !!p.publishedAt,
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-umber">
            {all.length} products · add, edit, price and publish.
          </p>
        </div>
        <Button href="/admin/products/new">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </header>

      <ProductsTable products={rows} />
    </div>
  );
}
