import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { repo } from "@/lib/data";
import { HomepageCollectionsManager } from "@/components/admin/homepage-collections-manager";

export const metadata = { title: "Homepage · Collections" };

export default async function AdminHomepageCollectionsPage() {
  const [collections, homepageCollections] = await Promise.all([
    repo.getCollections(),
    repo.getHomepageCollections(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/homepage"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
        >
          <ArrowLeft className="h-4 w-4" /> Homepage sections
        </Link>
        <h1 className="heading-display text-2xl font-semibold text-ink">
          &ldquo;The Collections&rdquo; grid
        </h1>
        <p className="mt-1 text-sm text-umber">
          The curated collection tiles shown under the hero. Use the crosshair on a slot to
          adjust which part of its cover stays in view.
        </p>
      </div>

      <HomepageCollectionsManager
        collections={collections
          .filter((c) => c.published)
          .map((c) => ({
            id: c.id,
            title: c.title,
            group: c.group,
            image: c.image,
            imageFocalX: c.imageFocalX ?? null,
            imageFocalY: c.imageFocalY ?? null,
          }))}
        initial={homepageCollections}
      />
    </div>
  );
}
