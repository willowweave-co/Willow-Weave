import Link from "next/link";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { repo } from "@/lib/data";
import { formatPKR } from "@/lib/money";
import { productPriceRange } from "@/components/store/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const all = await repo.getProducts({ includeUnpublished: true });
  const products = query
    ? all.filter((p) =>
        `${p.title} ${p.productType} ${p.fabrics.join(" ")} ${p.tags.join(" ")}`
          .toLowerCase()
          .includes(query)
      )
    : all;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-umber">
            {all.length} products · add, edit, price and publish.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <form action="/admin/products" className="relative min-w-40 flex-1 sm:flex-none">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search products…"
              className="w-full rounded-full border border-line bg-white/70 py-2 pr-4 pl-9 text-sm focus:border-walnut focus:outline-none sm:w-56"
            />
          </form>
          <Button href="/admin/products/new">
            <Plus className="h-4 w-4" /> New product
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white/60">
        <table className="w-full min-w-[520px] text-sm md:min-w-[760px]">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
              <th className="px-4 py-3.5 font-medium sm:px-5">Product</th>
              <th className="hidden px-4 py-3.5 font-medium md:table-cell">Type / Fabric</th>
              <th className="px-4 py-3.5 font-medium">Price</th>
              <th className="px-4 py-3.5 font-medium">Stock</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const { min, compareAt } = productPriceRange(p);
              const stock = p.variants.reduce((n, v) => n + v.stock, 0);
              return (
                <tr key={p.id} className="group relative transition-colors hover:bg-linen/50">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0].src}
                          alt=""
                          width={44}
                          height={55}
                          className="h-14 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="block h-14 w-11 shrink-0 rounded-lg bg-parchment" />
                      )}
                      <Link
                        href={`/admin/products/${p.id}` as never}
                        className="line-clamp-2 max-w-72 font-medium text-ink after:absolute after:inset-0"
                      >
                        {p.title}
                      </Link>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-bark md:table-cell">
                    {p.productType}
                    {p.fabrics.length > 0 && (
                      <span className="block text-xs text-umber">{p.fabrics.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{formatPKR(min)}</span>
                    {compareAt && (
                      <s className="ml-1.5 text-xs text-umber">{formatPKR(compareAt)}</s>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        stock === 0
                          ? "font-semibold text-madder"
                          : stock <= 5
                            ? "font-semibold text-walnut-dark"
                            : "text-bark"
                      }
                    >
                      {stock}
                    </span>
                    <span className="text-xs text-umber"> across {p.variants.length} variants</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.publishedAt ? (
                      <Badge tone="success">Live</Badge>
                    ) : (
                      <Badge tone="neutral">Draft</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!products.length && (
          <p className="py-14 text-center text-sm text-umber">No products match that search.</p>
        )}
      </div>
    </div>
  );
}
