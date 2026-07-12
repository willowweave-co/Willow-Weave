import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/store/price";
import { discountPercent } from "@/lib/money";
import { cn, focalPosition } from "@/lib/utils";

export function productPriceRange(p: Product) {
  const prices = p.variants.map((v) => v.price);
  const compares = p.variants
    .map((v) => v.compareAtPrice)
    .filter((x): x is number => x != null);
  return {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    compareAt: compares.length ? Math.max(...compares) : null,
  };
}

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const { min, max, compareAt } = productPriceRange(product);
  const soldOut = !product.variants.some((v) => v.stock > 0);
  const pct = discountPercent(min, compareAt);
  const [img1, img2] = product.images;

  return (
    <Link
      href={`/products/${product.handle}`}
      className={cn("group block", className)}
      prefetch={false}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-linen">
        {img1 ? (
          <>
            <Image
              src={img1.src}
              alt={img1.alt || product.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition duration-500 group-hover:scale-[1.04]",
                img2 && "group-hover:opacity-0"
              )}
              style={focalPosition(img1.focalX, img1.focalY)}
            />
            {img2 && (
              <Image
                src={img2.src}
                alt={img2.alt || product.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover opacity-0 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                style={focalPosition(img2.focalX, img2.focalY)}
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-umber/40">No image</div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {pct != null && <Badge tone="sale">−{pct}%</Badge>}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-ivory/55 backdrop-blur-[1px]">
            <Badge tone="neutral" className="bg-ink/80 text-ivory">Sold out</Badge>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1 px-0.5">
        {product.productType && (
          <p className="text-[0.7rem] font-medium tracking-widest text-umber uppercase">
            {product.productType}
            {product.fabrics.length > 0 && ` · ${product.fabrics[0]}`}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink group-hover:underline group-hover:underline-offset-4">
          {product.title}
        </h3>
        <Price price={min} compareAtPrice={compareAt} prefix={max > min ? "from" : undefined} size="sm" />
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
  className,
}: {
  products: Product[];
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4",
        className
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
