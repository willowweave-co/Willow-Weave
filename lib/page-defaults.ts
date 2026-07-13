// Server-only: pulls in lib/content (node:fs). Client components import
// from lib/site-pages instead.
import { getContent } from "@/lib/content";
import { repo } from "@/lib/data";
import { CONTACT_DEFAULT, EDITABLE_PAGES, type SitePage } from "@/lib/site-pages";

/**
 * Resolves the effective copy for an editable page: the admin-saved override
 * when one exists, otherwise the built-in copy from data/content.json.
 */
export async function resolveSitePage(handle: string): Promise<SitePage | null> {
  const entry = EDITABLE_PAGES.find((p) => p.handle === handle);
  if (!entry) return null;
  const [content, overrides] = await Promise.all([getContent(), repo.getSitePages()]);
  const override = overrides[handle];
  if (override) return { handle, ...override };

  if (entry.source === "contact") return { handle, ...CONTACT_DEFAULT };
  if (entry.source === "policy") {
    const p = content.policies[handle];
    return { handle, title: p?.title ?? entry.label, bodyHtml: p?.bodyHtml ?? "" };
  }
  const p = content.pages[handle as keyof typeof content.pages];
  return { handle, title: p?.title ?? entry.label, bodyHtml: p?.bodyHtml ?? "" };
}
