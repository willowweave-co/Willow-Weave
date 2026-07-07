import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { repo } from "@/lib/data";
import { getContent } from "@/lib/content";
import { ProductGallery } from "@/components/store/product-gallery";
import { VariantPicker } from "@/components/store/variant-picker";
import { SizeChartModal } from "@/components/store/size-chart-modal";
import { AccordionItem } from "@/components/ui/accordion";
import { ProductGrid, productPriceRange } from "@/components/store/product-card";
import { Badge } from "@/components/ui/badge";
import { discountPercent } from "@/lib/money";
import { ogImage, stripHtml, truncate } from "@/lib/utils";

export const revalidate = 600;

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateStaticParams() {
  const products = await repo.getProducts();
  return products.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await repo.getProductByHandle(handle);
  if (!product) return { title: "Product not found" };
  const description = truncate(stripHtml(product.descriptionHtml), 160);
  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.images[0] ? [ogImage(product.images[0].src)] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const [product, collections, sizeCharts, content, settings] = await Promise.all([
    repo.getProductByHandle(handle),
    repo.getCollections(),
    repo.getSizeCharts(),
    getContent(),
    repo.getSettings(),
  ]);
  if (!product) notFound();

  const productCollections = collections.filter((c) => c.productIds.includes(product.id));
  const primaryCollection = productCollections[0] ?? null;

  // related: same collection first, then same type
  const all = await repo.getProducts();
  const relatedPool = new Map<string, (typeof all)[number]>();
  for (const c of productCollections) {
    for (const id of c.productIds) {
      const p = all.find((x) => x.id === id);
      if (p && p.id !== product.id) relatedPool.set(p.id, p);
    }
  }
  for (const p of all) {
    if (p.id !== product.id && p.productType === product.productType) relatedPool.set(p.id, p);
  }
  const related = [...relatedPool.values()].slice(0, 4);

  const relevantCharts = product.sizeChartId
    ? sizeCharts.filter((c) => c.id === product.sizeChartId).concat(
        sizeCharts.filter((c) => c.id !== product.sizeChartId)
      )
    : sizeCharts;

  const { min, compareAt } = productPriceRange(product);
  const pct = discountPercent(min, compareAt);
  const inStock = product.variants.some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: truncate(stripHtml(product.descriptionHtml), 300),
    image: product.images.map((i) => i.src),
    brand: { "@type": "Brand", name: "Willow Weave" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: min,
      highPrice: productPriceRange(product).max,
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-site py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-umber">
        <Link href="/" className="hover:text-walnut">Home</Link>
        <ChevronRight className="h-3 w-3" />
        {primaryCollection ? (
          <>
            <Link href={`/collections/${primaryCollection.handle}`} className="hover:text-walnut">
              {primaryCollection.title}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        ) : (
          <>
            <Link href="/products" className="hover:text-walnut">Products</Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-bark">{truncate(product.title, 50)}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.productType && <Badge>{product.productType}</Badge>}
            {product.fabrics.map((f) => (
              <Badge key={f} tone="gold">{f}</Badge>
            ))}
            {pct != null && <Badge tone="sale">Save {pct}%</Badge>}
          </div>

          <h1 className="heading-display mt-3 text-2xl leading-tight font-semibold text-ink sm:text-[2rem]">
            {product.title}
          </h1>

          <div className="mt-5">
            <VariantPicker product={product} />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-3">
            <span className="text-sm text-bark">Not sure about your size?</span>
            <SizeChartModal charts={relevantCharts} />
          </div>

          {/* description + accordions */}
          <div className="mt-8">
            {product.descriptionHtml && (
              <div
                className="rte"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            )}
            <div className="mt-5 border-t border-line">
              {content.accordions.care && (
                <AccordionItem label={content.accordions.care.label}>
                  <div
                    className="rte"
                    dangerouslySetInnerHTML={{ __html: content.accordions.care.bodyHtml }}
                  />
                </AccordionItem>
              )}
              {content.accordions.design && (
                <AccordionItem label={content.accordions.design.label}>
                  <div
                    className="rte"
                    dangerouslySetInnerHTML={{ __html: content.accordions.design.bodyHtml }}
                  />
                </AccordionItem>
              )}
              <AccordionItem label="Delivery & Returns">
                <div className="rte">
                  <p>
                    <strong>Cash on Delivery</strong> across Pakistan. Orders are processed within
                    1–3 business days; delivery takes 2–5 business days in urban areas and 5–7 in
                    remote areas.
                    {settings.shippingFee > 0 ? (
                      <> Delivery charge Rs. {settings.shippingFee.toLocaleString("en-PK")}
                      {settings.freeShippingThreshold ? (
                        <> — free over Rs. {settings.freeShippingThreshold.toLocaleString("en-PK")}</>
                      ) : null}.</>
                    ) : (
                      <> Delivery is free.</>
                    )}
                  </p>
                  <p>
                    See the full <Link href="/policies/shipping-policy">shipping policy</Link> and{" "}
                    <Link href="/policies/refund-policy">refund policy</Link>.
                  </p>
                </div>
              </AccordionItem>
              {productCollections.length > 0 && (
                <AccordionItem label="Collections">
                  <ul className="flex flex-wrap gap-2">
                    {productCollections.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/collections/${c.handle}`}
                          className="inline-block rounded-full border border-line px-3.5 py-1.5 text-sm text-bark transition-colors hover:border-walnut hover:text-walnut"
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="heading-display mb-6 text-2xl font-semibold text-ink">
            You may also like
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
