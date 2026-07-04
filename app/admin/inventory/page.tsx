import { repo } from "@/lib/data";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata = { title: "Inventory" };

interface Props {
  searchParams: Promise<{ low?: string; q?: string }>;
}

export default async function AdminInventoryPage({ searchParams }: Props) {
  const { low, q } = await searchParams;
  const products = await repo.getProducts({ includeUnpublished: true });

  const rows = products.flatMap((p) =>
    p.variants.map((v) => ({
      productId: p.id,
      productTitle: p.title,
      handle: p.handle,
      image: p.images[0]?.src ?? null,
      variantId: v.id,
      label: [v.color, v.size].filter(Boolean).join(" / ") || v.title || "Default",
      price: v.price,
      stock: v.stock,
      published: !!p.publishedAt,
    }))
  );

  return (
    <InventoryTable
      rows={rows}
      initialLowOnly={low === "1"}
      initialQuery={q ?? ""}
    />
  );
}
