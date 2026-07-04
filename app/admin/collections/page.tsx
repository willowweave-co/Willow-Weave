import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { repo } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Collections" };

const GROUP_LABEL: Record<string, string> = {
  occasions: "Occasion",
  volumes: "Volume",
  pieces: "By piece",
  fabrics: "Fabric",
};

export default async function AdminCollectionsPage() {
  const collections = await repo.getCollections({ includeUnpublished: true });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-semibold text-ink">Collections</h1>
          <p className="mt-1 text-sm text-umber">
            {collections.length} collections — group products by season, occasion, piece or fabric.
          </p>
        </div>
        <Button href="/admin/collections/new">
          <Plus className="h-4 w-4" /> New collection
        </Button>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white/60">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-umber uppercase">
              <th className="px-5 py-3.5 font-medium">Collection</th>
              <th className="px-4 py-3.5 font-medium">Group</th>
              <th className="px-4 py-3.5 font-medium">Products</th>
              <th className="px-4 py-3.5 font-medium">Featured</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {collections.map((c) => (
              <tr key={c.id} className="group relative transition-colors hover:bg-linen/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {c.image ? (
                      <Image
                        src={c.image}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="block h-11 w-11 shrink-0 rounded-lg bg-parchment" />
                    )}
                    <Link
                      href={`/admin/collections/${c.id}` as never}
                      className="font-medium text-ink after:absolute after:inset-0"
                    >
                      {c.title}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-bark">{GROUP_LABEL[c.group] ?? c.group}</td>
                <td className="px-4 py-3 text-bark">{c.productIds.length}</td>
                <td className="px-4 py-3">{c.featured ? <Badge tone="gold">Featured</Badge> : "—"}</td>
                <td className="px-4 py-3">
                  {c.published ? <Badge tone="success">Live</Badge> : <Badge>Hidden</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
