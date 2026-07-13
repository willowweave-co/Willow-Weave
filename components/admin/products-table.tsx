"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatPKR } from "@/lib/money";
import { focalPosition } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface ProductRow {
  id: string;
  title: string;
  image: string | null;
  focalX: number | null;
  focalY: number | null;
  productType: string;
  fabrics: string[];
  tags: string[];
  minPrice: number;
  compareAt: number | null;
  stock: number;
  variantCount: number;
  published: boolean;
}

/** Client-side product list — the search filters as you type. */
export function ProductsTable({ products: all }: { products: ProductRow[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const products = useMemo(
    () =>
      query
        ? all.filter((p) =>
            `${p.title} ${p.productType} ${p.fabrics.join(" ")} ${p.tags.join(" ")}`
              .toLowerCase()
              .includes(query)
          )
        : all,
    [all, query]
  );

  return (
    <>
      <div className="relative mb-4 w-full sm:w-64">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-full border border-line bg-white/70 py-2 pr-4 pl-9 text-sm focus:border-walnut focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white/60">
        <table className="w-full text-sm sm:min-w-[560px] md:min-w-[760px]">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
              <th className="px-3 py-3.5 font-medium sm:px-5">Product</th>
              <th className="hidden px-4 py-3.5 font-medium md:table-cell">Type / Fabric</th>
              <th className="px-2 py-3.5 font-medium sm:px-4">Price</th>
              <th className="px-2 py-3.5 font-medium sm:px-4">Stock</th>
              <th className="hidden px-4 py-3.5 font-medium sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="group relative transition-colors hover:bg-linen/50">
                <td className="px-3 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt=""
                        width={44}
                        height={55}
                        className="h-14 w-11 shrink-0 rounded-lg object-cover"
                        style={focalPosition(p.focalX, p.focalY)}
                      />
                    ) : (
                      <span className="block h-14 w-11 shrink-0 rounded-lg bg-parchment" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${p.id}` as never}
                        className="line-clamp-2 max-w-72 font-medium text-ink after:absolute after:inset-0"
                      >
                        {p.title}
                      </Link>
                      {!p.published && <span className="text-xs text-umber sm:hidden">Draft</span>}
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-bark md:table-cell">
                  {p.productType}
                  {p.fabrics.length > 0 && (
                    <span className="block text-xs text-umber">{p.fabrics.join(", ")}</span>
                  )}
                </td>
                <td className="px-2 py-3 whitespace-nowrap sm:px-4">
                  <span className="font-medium text-ink">{formatPKR(p.minPrice)}</span>
                  {p.compareAt && (
                    <s className="ml-1.5 hidden text-xs text-umber sm:inline">
                      {formatPKR(p.compareAt)}
                    </s>
                  )}
                </td>
                <td className="px-2 py-3 sm:px-4">
                  <span
                    className={
                      p.stock === 0
                        ? "font-semibold text-madder"
                        : p.stock <= 5
                          ? "font-semibold text-walnut-dark"
                          : "text-bark"
                    }
                  >
                    {p.stock}
                  </span>
                  <span className="hidden text-xs text-umber sm:inline">
                    {" "}
                    across {p.variantCount} variants
                  </span>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {p.published ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Draft</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && (
          <p className="py-14 text-center text-sm text-umber">No products match that search.</p>
        )}
      </div>
    </>
  );
}
