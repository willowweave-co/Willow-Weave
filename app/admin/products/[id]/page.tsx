import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import type { Product } from "@/lib/types";
import { ProductForm } from "@/components/admin/product-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit product" };

function blankProduct(): Product {
  const now = new Date().toISOString();
  return {
    id: `new-${Date.now()}`,
    handle: "",
    title: "",
    descriptionHtml: "",
    productType: "",
    fabrics: [],
    tags: [],
    vendor: "Willow Weave",
    publishedAt: now,
    createdAt: now,
    options: [],
    images: [],
    variants: [],
    sizeChartId: null,
  };
}

export default async function AdminProductEditPage({ params }: Props) {
  const { id } = await params;
  const [allProducts, collections, sizeCharts] = await Promise.all([
    repo.getProducts({ includeUnpublished: true }),
    repo.getCollections({ includeUnpublished: true }),
    repo.getSizeCharts(),
  ]);

  let product: Product;
  if (id === "new") {
    product = blankProduct();
  } else {
    const found = allProducts.find((p) => p.id === id);
    if (!found) notFound();
    product = found;
  }

  const knownTypes = [...new Set(allProducts.map((p) => p.productType).filter(Boolean))].sort();
  const knownFabrics = [...new Set(allProducts.flatMap((p) => p.fabrics))].sort();
  const memberOf = collections.filter((c) => c.productIds.includes(product.id)).map((c) => c.id);

  return (
    <ProductForm
      key={product.id}
      initial={product}
      isNew={id === "new"}
      collections={collections.map((c) => ({ id: c.id, title: c.title, group: c.group }))}
      sizeCharts={sizeCharts.map((s) => ({ id: s.id, name: s.name }))}
      knownTypes={knownTypes}
      knownFabrics={knownFabrics}
      initialCollectionIds={memberOf}
    />
  );
}
