import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/store/price";
import { CardAddButton } from "@/components/store/card-add-button";
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
  // quick-add uses the first in-stock variant; size is adjustable in the cart
  const quickAdd = product.variants.find((v) => v.stock > 0);

  return (
    // The card is a <div>, not a <Link>: the quick-add button lives inside it,
    // and an <a> may not contain a <button> — browsers and screen readers each
    // recover from that differently, so keyboard traversal was unpredictable.
    // The anchor now wraps only the title (a far better accessible name than
    // the whole card's contents) and stretches over the card via a ::before
    // overlay, so the entire card stays clickable exactly as before. Quick-add
    // sits at z-10, above that overlay, and keeps working.
    <div className={cn("group relative", className)}>
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
          <div className="flex h-full items-center justify-center text-umber">No image</div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {pct != null && <Badge tone="sale">−{pct}%</Badge>}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-ivory/55 backdrop-blur-[1px]">
            <Badge tone="neutral" className="bg-ink/80 text-ivory">Sold out</Badge>
          </div>
        )}
        {quickAdd && (
          <CardAddButton
            item={{
              productId: product.id,
              variantId: quickAdd.id,
              handle: product.handle,
              title: product.title,
              size: quickAdd.size,
              color: quickAdd.color,
              unitPrice: quickAdd.price,
              compareAtPrice: quickAdd.compareAtPrice,
              image: img1?.src ?? null,
              maxStock: quickAdd.stock,
            }}
          />
        )}
      </div>
      <div className="mt-3 space-y-1 px-0.5">
        {product.productType && (
          <p className="text-[0.7rem] font-medium tracking-widest text-umber uppercase">
            {product.productType}
            {product.fabrics.length > 0 && ` · ${product.fabrics[0]}`}
          </p>
        )}
        {/* The anchor wraps the <h3> rather than sitting inside it: line-clamp
            puts `overflow: hidden` on the heading, which would clip the
            ::before overlay down to the title's own box and stop the image
            from being clickable. `block` so `space-y-1` still applies its
            margin — margin-top is ignored on an inline box.

            default prefetch on purpose: product pages are prerendered (SSG),
            so cards fetch them as they scroll into view and a tap opens
            instantly — prefetch={false} here made every click wait a full
            round trip with no skeleton, which read as "the site is broken" */}
        <Link
          href={`/products/${product.handle}`}
          className="focus-ring block rounded-sm before:absolute before:inset-0 before:content-['']"
        >
          <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink group-hover:underline group-hover:underline-offset-4">
            {product.title}
          </h3>
        </Link>
        <Price price={min} compareAtPrice={compareAt} prefix={max > min ? "from" : undefined} size="sm" />
      </div>
    </div>
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
