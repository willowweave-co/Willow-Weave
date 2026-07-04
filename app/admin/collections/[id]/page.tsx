import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import type { Collection } from "@/lib/types";
import { CollectionForm } from "@/components/admin/collection-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit collection" };

function blankCollection(position: number): Collection {
  return {
    id: `new-${Date.now()}`,
    handle: "",
    title: "",
    descriptionHtml: "",
    image: null,
    group: "fabrics",
    position,
    featured: false,
    published: true,
    productIds: [],
  };
}

export default async function AdminCollectionEditPage({ params }: Props) {
  const { id } = await params;
  const [collections, products] = await Promise.all([
    repo.getCollections({ includeUnpublished: true }),
    repo.getProducts({ includeUnpublished: true }),
  ]);

  let collection: Collection;
  if (id === "new") {
    collection = blankCollection(collections.length);
  } else {
    const found = collections.find((c) => c.id === id);
    if (!found) notFound();
    collection = found;
  }

  return (
    <CollectionForm
      key={collection.id}
      initial={collection}
      isNew={id === "new"}
      products={products.map((p) => ({
        id: p.id,
        title: p.title,
        image: p.images[0]?.src ?? null,
      }))}
    />
  );
}
