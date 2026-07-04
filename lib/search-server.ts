import { repo } from "@/lib/data";
import { getContent } from "@/lib/content";
import {
  buildSearchDocs,
  searchDocs,
  type StaticPageDoc,
} from "@/lib/search";
import type { SearchResult } from "@/lib/types";
import { stripHtml } from "@/lib/utils";

/**
 * Site-wide search: products + collections + every static page (about,
 * philosophy, policies, contact, size guide — including the actual chart
 * measurements, so "chest", "waist stretched", etc. resolve correctly).
 */
export async function searchSite(query: string, limit = 12): Promise<SearchResult[]> {
  const [products, collections, sizeCharts, content] = await Promise.all([
    repo.getProducts(),
    repo.getCollections(),
    repo.getSizeCharts(),
    getContent(),
  ]);

  const sizeGuideBody = sizeCharts
    .map(
      (c) =>
        `${c.name} ${c.appliesTo} ${c.columns.join(" ")} ${c.rows.map((r) => r.join(" ")).join(" ")} ${c.note}`
    )
    .join(" ");

  const pages: StaticPageDoc[] = [
    {
      title: "Size Guide",
      url: "/size-guide",
      subtitle: "Measurements & fit",
      keywords: "size chart sizes measurements fit chest waist length shoulder hem hip trousers top",
      body: `${content.home.sizeChartSection.heading} ${stripHtml(content.home.sizeChartSection.bodyHtml)} ${sizeGuideBody}`,
    },
    {
      title: content.pages.about.title || "About Us",
      url: "/about",
      subtitle: "Our story",
      keywords: "about brand story willow weave",
      body: stripHtml(content.pages.about.bodyHtml),
    },
    {
      title: content.pages.philosophy.title || "Philosophy Behind Logo",
      url: "/philosophy",
      subtitle: "Our story",
      keywords: "logo philosophy willow tree meaning",
      body: stripHtml(content.pages.philosophy.bodyHtml),
    },
    {
      title: "Contact",
      url: "/contact",
      subtitle: "Get in touch",
      keywords: "contact phone email whatsapp support help",
      body: stripHtml(content.policies["contact-information"]?.bodyHtml ?? ""),
    },
    {
      title: "All Collections",
      url: "/collections",
      subtitle: "Browse every collection",
      keywords: "collections volumes eid fabrics",
      body: collections.map((c) => c.title).join(" "),
    },
    ...(["privacy-policy", "refund-policy", "terms-of-service", "shipping-policy"] as const).map(
      (slug) => ({
        title: content.policies[slug]?.title ?? slug,
        url: `/policies/${slug}`,
        subtitle: "Store policy",
        keywords: "policy delivery shipping refund return exchange terms privacy cod cash on delivery",
        body: stripHtml(content.policies[slug]?.bodyHtml ?? "").slice(0, 4000),
      })
    ),
  ];

  const docs = buildSearchDocs(products, collections, pages);
  return searchDocs(docs, query, limit);
}
