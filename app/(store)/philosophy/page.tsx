import type { Metadata } from "next";
import Image from "next/image";
import { getContent, THEME_IMAGES } from "@/lib/content";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Philosophy Behind Logo",
  description: "The meaning woven into the Willow Weave logo.",
};

export default async function PhilosophyPage() {
  const content = await getContent();
  return (
    <div className="container-site py-10 md:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">Willow Weave</p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          {content.pages.philosophy.title || "Philosophy Behind Logo"}
        </h1>
        <div className="mx-auto mt-8 w-52 sm:w-64">
          <Image
            src={THEME_IMAGES.logo}
            alt="The Willow Weave logo — a willow tree with deep roots"
            width={512}
            height={512}
            className="h-auto w-full object-contain"
            priority
          />
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-2xl">
        <div
          className="rte"
          dangerouslySetInnerHTML={{ __html: content.pages.philosophy.bodyHtml }}
        />
        <div className="mt-8 text-center">
          <Button href="/about" variant="outline">
            More about us
          </Button>
        </div>
      </div>
    </div>
  );
}
