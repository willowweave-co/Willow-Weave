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
    <div className="container-site py-10 md:py-14">
      <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="max-w-2xl">
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
        <div className="top-24 order-first mx-auto w-56 lg:sticky lg:order-none lg:w-full lg:max-w-sm">
          <div className="rounded-2xl border border-line bg-white p-8">
            <Image
              src={THEME_IMAGES.logo}
              alt="The Willow Weave logo — a willow tree with deep roots"
              width={480}
              height={480}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
