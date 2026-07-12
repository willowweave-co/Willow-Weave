import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { repo } from "@/lib/data";
import type { Collection, CollectionGroup } from "@/lib/types";
import { focalPosition } from "@/lib/utils";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse every Willow Weave collection — seasonal volumes, Eid edits, 2-piece and 3-piece suits, tops, trousers and fabrics from chiffon to velvet.",
};

const GROUP_META: Record<CollectionGroup, { title: string; blurb: string }> = {
  occasions: { title: "Occasions", blurb: "Celebration-ready edits for the festive calendar" },
  volumes: { title: "Seasonal Volumes", blurb: "Each volume tells the story of a season" },
  pieces: { title: "Shop by Piece", blurb: "Find exactly the silhouette you're after" },
  fabrics: { title: "Shop by Fabric", blurb: "From breezy chiffon to regal velvet" },
};

const GROUP_ORDER: CollectionGroup[] = ["occasions", "volumes", "pieces", "fabrics"];

function CollectionCard({ c }: { c: Collection }) {
  return (
    <Link
      href={`/collections/${c.handle}`}
      className="group relative block overflow-hidden rounded-xl bg-linen"
    >
      <div className="relative aspect-[4/5]">
        {c.image ? (
          <Image
            src={c.image}
            alt={c.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-500 group-hover:scale-[1.05]"
            style={focalPosition(c.imageFocalX, c.imageFocalY)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-parchment to-sand" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
        <div className="absolute right-3 bottom-3 left-3">
          <h3 className="heading-display text-[1.05rem] leading-tight font-semibold text-ivory">
            {c.title}
          </h3>
          <p className="mt-0.5 text-xs text-ivory/75">
            {c.productIds.length} {c.productIds.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function CollectionsPage() {
  const collections = await repo.getCollections();

  return (
    <div className="container-site py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">Willow Weave</p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          All Collections
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-umber">
          Every collection from the store, organised the way you shop — by occasion, season,
          silhouette and fabric.
        </p>
      </header>

      {GROUP_ORDER.map((group) => {
        const items = collections.filter((c) => c.group === group);
        if (!items.length) return null;
        const meta = GROUP_META[group];
        return (
          <section key={group} className="mb-12">
            <div className="mb-5 flex items-baseline justify-between border-b border-line pb-3">
              <div>
                <h2 className="heading-display text-xl font-semibold text-ink sm:text-2xl">
                  {meta.title}
                </h2>
                <p className="mt-0.5 text-sm text-umber">{meta.blurb}</p>
              </div>
              <span className="text-xs font-medium text-umber">{items.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((c) => (
                <CollectionCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="mt-4 rounded-2xl border border-line bg-parchment/60 p-6 text-center">
        <p className="text-sm text-bark">
          Prefer to see everything at once?
        </p>
        <Link
          href="/products"
          className="mt-2 inline-flex items-center gap-1.5 font-medium text-walnut hover:underline hover:underline-offset-4"
        >
          Browse the full catalog <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
