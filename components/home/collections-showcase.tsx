import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Collection } from "@/lib/types";
import { cn } from "@/lib/utils";

function CollectionTile({
  collection,
  className,
  wide = false,
}: {
  collection: Collection;
  className?: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className={cn("group relative block h-full overflow-hidden rounded-xl bg-linen", className)}
    >
      {/* on lg the wide tiles share a row with 4:5 tiles, which are taller —
          stretch to the full grid cell there instead of the 16:9 ratio */}
      <div className={cn("relative", wide ? "aspect-[16/9] lg:aspect-auto lg:h-full" : "aspect-[4/5]")}>
        {collection.image && (
          <Image
            src={collection.image}
            alt={collection.title}
            fill
            sizes={
              wide
                ? "(max-width: 1024px) 100vw, 50vw"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            }
            className="object-cover transition duration-500 group-hover:scale-[1.05]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
        <div className="absolute right-3 bottom-3 left-3">
          <p className="heading-display text-lg leading-tight font-semibold text-ivory">
            {collection.title}
          </p>
          <p className="mt-0.5 text-xs text-ivory/75">
            {collection.productIds.length}{" "}
            {collection.productIds.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function CollectionsShowcase({ collections }: { collections: Collection[] }) {
  const volumes = collections
    .filter((c) => c.group === "volumes")
    .sort((a, b) => b.handle.localeCompare(a.handle)) // newest volume first
    .slice(0, 3);
  const occasions = collections.filter((c) => c.group === "occasions");
  const pieces = collections.filter((c) => c.group === "pieces").slice(0, 4);

  return (
    <section className="container-site mt-14 md:mt-20">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">
            Curated by season, occasion & style
          </p>
          <h2 className="heading-display mt-1 text-2xl font-semibold text-ink sm:text-3xl">
            The Collections
          </h2>
        </div>
        <Link
          href="/collections"
          className="hidden items-center gap-1.5 text-sm font-medium text-walnut hover:underline hover:underline-offset-4 sm:flex"
        >
          All collections <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {occasions.slice(0, 1).map((c) => (
          <CollectionTile key={c.id} collection={c} className="col-span-2" wide />
        ))}
        {volumes.slice(0, 2).map((c) => (
          <CollectionTile key={c.id} collection={c} />
        ))}
        {pieces.slice(0, 2).map((c) => (
          <CollectionTile key={c.id} collection={c} />
        ))}
        {occasions.slice(1, 2).map((c) => (
          <CollectionTile key={c.id} collection={c} className="col-span-2" wide />
        ))}
      </div>

      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-walnut"
        >
          View all collections <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
