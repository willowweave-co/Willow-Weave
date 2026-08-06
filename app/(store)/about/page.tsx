import type { Metadata } from "next";
import Image from "next/image";
import { THEME_IMAGES } from "@/lib/content";
import { resolveSitePage } from "@/lib/page-defaults";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Willow Weave — a women's clothing brand where every thread tells a story of elegance and comfort.",
};

export default async function AboutPage() {
  const page = await resolveSitePage("about");
  return (
    // Single column, max-w-3xl — matching the policy and philosophy pages.
    // The old two-column layout gave a full screen column to the logo alone,
    // which made this the one page in the store with its own structure.
    <div className="container-site py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-8 w-40 sm:w-48">
          {/* No plate behind the mark: the white card was the only place on
              the store the logo sat on its own background. The drop shadow
              does the lifting instead, as it now does everywhere else. */}
          <Image
            src={THEME_IMAGES.logo}
            alt="The Willow Weave logo — a willow tree with deep roots"
            width={480}
            height={480}
            className="logo-shadow h-auto w-full object-contain"
          />
        </div>
        <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">Our story</p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          {page?.title || "About Us"}
        </h1>
        <div className="rte mt-6" dangerouslySetInnerHTML={{ __html: page?.bodyHtml ?? "" }} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/products">Shop the collection</Button>
          <Button href="/philosophy" variant="outline">
            The philosophy behind our logo
          </Button>
        </div>
      </div>
    </div>
  );
}
