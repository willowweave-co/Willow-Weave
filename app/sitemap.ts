import type { MetadataRoute } from "next";
import { repo } from "@/lib/data";
import { POLICY_SLUGS } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [products, collections] = await Promise.all([
    repo.getProducts(),
    repo.getCollections(),
  ]);

  const staticPages = [
    "",
    "/products",
    "/collections",
    "/size-guide",
    "/about",
    "/philosophy",
    "/contact",
    ...POLICY_SLUGS.map((s) => `/policies/${s}`),
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  return [
    ...staticPages,
    ...collections.map((c) => ({
      url: `${base}/collections/${c.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
