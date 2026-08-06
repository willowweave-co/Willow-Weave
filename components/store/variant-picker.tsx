"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, PackageX } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/types";
import { useCart } from "@/lib/cart/cart-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/store/price";
import { cn } from "@/lib/utils";

function uniqueInOrder(values: (string | null)[]): string[] {
  const out: string[] = [];
  for (const v of values) if (v && !out.includes(v)) out.push(v);
  return out;
}

export function VariantPicker({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const colors = useMemo(() => uniqueInOrder(product.variants.map((v) => v.color)), [product]);
  const sizes = useMemo(() => uniqueInOrder(product.variants.map((v) => v.size)), [product]);

  const firstAvailable =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0];

  const [color, setColor] = useState<string | null>(firstAvailable?.color ?? null);
  const [size, setSize] = useState<string | null>(firstAvailable?.size ?? null);
  const [qty, setQty] = useState(1);

  const findVariant = (c: string | null, s: string | null): ProductVariant | undefined =>
    product.variants.find((v) => (v.color ?? null) === c && (v.size ?? null) === s);

  const current = findVariant(color, size);
  const stock = current?.stock ?? 0;
  const canBuy = !!current && stock > 0;

  const add = () => {
    if (!current || !canBuy) return;
    addItem(
      {
        productId: product.id,
        variantId: current.id,
        handle: product.handle,
        title: product.title,
        size: current.size,
        color: current.color,
        unitPrice: current.price,
        compareAtPrice: current.compareAtPrice,
        image: product.images[0]?.src ?? null,
        maxStock: current.stock,
      },
      qty
    );
    toast(`Added to cart — ${product.title}`);
  };

  return (
    <div className="space-y-5">
      {/* price */}
      <div>
        {current ? (
          <Price price={current.price} compareAtPrice={current.compareAtPrice} size="lg" />
        ) : (
          <Price
            price={Math.min(...product.variants.map((v) => v.price))}
            compareAtPrice={null}
            size="lg"
            prefix="from"
          />
        )}
        <p className="mt-1 text-xs text-umber">Cash on Delivery · inclusive of all taxes</p>
      </div>

      {/* colour */}
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-ink uppercase">
            Colour{color ? <span className="ml-2 font-normal normal-case text-umber">{color}</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const anyStock = product.variants.some((v) => v.color === c && v.stock > 0);
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "focus-ring tap-tall rounded-full border px-4 py-2 text-sm transition-colors",
                    color === c
                      ? "border-walnut bg-walnut text-ivory"
                      : "border-line bg-white/60 text-bark hover:border-walnut/50",
                    !anyStock && "opacity-45"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* size */}
      {sizes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
              Size{size ? <span className="ml-2 font-normal normal-case text-umber">{size}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const v = findVariant(color, s);
              const out = !v || v.stock <= 0;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  aria-label={out ? `Size ${s} — out of stock` : `Size ${s}`}
                  className={cn(
                    "focus-ring tap-tall relative min-w-12 rounded-full border px-4 py-2 text-sm transition-colors",
                    size === s
                      ? "border-walnut bg-walnut text-ivory"
                      : "border-line bg-white/60 text-bark hover:border-walnut/50",
                    // /90 not /50: this is state, not decoration — at 2.16:1 a
                    // sold-out size was almost indistinguishable from an
                    // available one, which costs a tap at the buying moment.
                    // The strikethrough already carries the meaning without
                    // relying on colour alone; this just makes it readable.
                    out && "text-umber/90 line-through decoration-umber/90"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* stock state */}
      <div aria-live="polite">
        {!current || stock === 0 ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-madder">
            <PackageX className="h-4 w-4" /> Out of stock
            {size ? ` in ${size}` : ""} — try another {colors.length ? "colour or size" : "size"}
          </p>
        ) : stock <= 3 ? (
          <p className="text-sm font-medium text-madder">
            Only {stock} left in this size — order soon
          </p>
        ) : (
          <p className="text-sm font-medium text-moss">In stock, ready to ship</p>
        )}
      </div>

      {/* qty + add */}
      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-full border border-line bg-white/60">
          <button
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="focus-ring tap-tall rounded-full px-3.5 py-3 text-bark hover:text-walnut"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(stock || 1, q + 1))}
            className="focus-ring tap-tall rounded-full px-3.5 py-3 text-bark hover:text-walnut disabled:opacity-30"
            disabled={qty >= stock}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={add} disabled={!canBuy} size="lg" className="flex-1">
          <ShoppingBag className="h-4.5 w-4.5" />
          {canBuy ? "Add to cart" : "Unavailable"}
        </Button>
      </div>

      <p className="rounded-xl bg-parchment/70 px-4 py-3 text-center text-xs leading-relaxed text-bark">
        💵 <strong>Cash on Delivery</strong> across Pakistan & worldwide shipping — pay when your order arrives.
      </p>
    </div>
  );
}
