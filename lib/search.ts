import type { Collection, Product, SearchResult } from "@/lib/types";
import { stripHtml, truncate } from "@/lib/utils";
import { formatPKR } from "@/lib/money";

/**
 * Dependency-free, typo-tolerant search over the whole site: products,
 * collections, and static pages. At this catalog size an in-process engine
 * beats an external service on both latency and accuracy, and behaves
 * identically in local and Supabase modes.
 */

interface Haystack {
  text: string;
  weight: number;
}

export interface SearchDoc {
  type: SearchResult["type"];
  title: string;
  url: string;
  subtitle: string | null;
  image: string | null;
  price: number | null;
  compareAtPrice: number | null;
  haystacks: Haystack[];
}

export interface StaticPageDoc {
  title: string;
  url: string;
  subtitle?: string;
  body: string;
  keywords?: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trigrams(word: string): Set<string> {
  const w = `  ${word} `;
  const grams = new Set<string>();
  for (let i = 0; i < w.length - 2; i++) grams.add(w.slice(i, i + 3));
  return grams;
}

/** Dice coefficient over trigram sets — same idea as Postgres pg_trgm. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

export function buildSearchDocs(
  products: Product[],
  collections: Collection[],
  pages: StaticPageDoc[]
): SearchDoc[] {
  const collectionTitlesByProduct = new Map<string, string[]>();
  for (const c of collections) {
    for (const pid of c.productIds) {
      const arr = collectionTitlesByProduct.get(pid) ?? [];
      arr.push(c.title);
      collectionTitlesByProduct.set(pid, arr);
    }
  }

  const docs: SearchDoc[] = [];

  for (const p of products) {
    if (!p.publishedAt) continue;
    const prices = p.variants.map((v) => v.price);
    const compares = p.variants.map((v) => v.compareAtPrice).filter((x): x is number => !!x);
    const sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))].join(" ");
    const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))].join(" ");
    docs.push({
      type: "product",
      title: p.title,
      url: `/products/${p.handle}`,
      subtitle: p.productType || null,
      image: p.images[0]?.src ?? null,
      price: prices.length ? Math.min(...prices) : null,
      compareAtPrice: compares.length ? Math.max(...compares) : null,
      haystacks: [
        { text: normalize(p.title), weight: 3 },
        {
          text: normalize(
            [p.productType, p.tags.join(" "), p.fabrics.join(" "), sizes, colors, (collectionTitlesByProduct.get(p.id) ?? []).join(" ")].join(" ")
          ),
          weight: 2,
        },
        { text: normalize(stripHtml(p.descriptionHtml)), weight: 1 },
      ],
    });
  }

  for (const c of collections) {
    if (!c.published) continue;
    docs.push({
      type: "collection",
      title: c.title,
      url: `/collections/${c.handle}`,
      subtitle: `${c.productIds.length} ${c.productIds.length === 1 ? "piece" : "pieces"}`,
      image: c.image,
      price: null,
      compareAtPrice: null,
      haystacks: [
        { text: normalize(c.title), weight: 3 },
        { text: normalize(`collection ${c.group} ${stripHtml(c.descriptionHtml)}`), weight: 1.5 },
      ],
    });
  }

  for (const pg of pages) {
    docs.push({
      type: "page",
      title: pg.title,
      url: pg.url,
      subtitle: pg.subtitle ?? null,
      image: null,
      price: null,
      compareAtPrice: null,
      haystacks: [
        { text: normalize(pg.title + " " + (pg.keywords ?? "")), weight: 3 },
        { text: normalize(pg.body), weight: 1 },
      ],
    });
  }

  return docs;
}

function scoreDoc(doc: SearchDoc, qFull: string, qTokens: string[]): number {
  let score = 0;
  for (const hs of doc.haystacks) {
    if (!hs.text) continue;
    if (qFull.length > 2 && hs.text.includes(qFull)) score += 12 * hs.weight;
    const words: string[] | null = qTokens.some((t) => t.length > 3) ? hs.text.split(" ") : null;
    for (const tok of qTokens) {
      if (new RegExp(`(^| )${escapeRe(tok)}`).test(hs.text)) {
        score += 6 * hs.weight; // word-prefix match
      } else if (hs.text.includes(tok)) {
        score += 3 * hs.weight; // substring match
      } else if (tok.length > 3 && words) {
        // typo tolerance: best fuzzy match against individual words
        let best = 0;
        for (const w of words) {
          if (Math.abs(w.length - tok.length) > 3) continue;
          const sim = similarity(tok, w);
          if (sim > best) best = sim;
        }
        if (best >= 0.42) score += 6 * hs.weight * best;
      }
    }
  }
  return score;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchDocs(docs: SearchDoc[], query: string, limit = 12): SearchResult[] {
  const qFull = normalize(query);
  const qTokens = qFull.split(" ").filter((t) => t.length >= 2);
  if (!qTokens.length && qFull.length < 2) return [];

  const results: SearchResult[] = [];
  for (const doc of docs) {
    const score = scoreDoc(doc, qFull, qTokens.length ? qTokens : [qFull]);
    if (score > 0) {
      results.push({
        type: doc.type,
        title: doc.title,
        url: doc.url,
        subtitle: doc.subtitle,
        image: doc.image,
        price: doc.price,
        compareAtPrice: doc.compareAtPrice,
        score,
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Human summary for a result row, e.g. "3-piece · from Rs. 4,999". */
export function resultMeta(r: SearchResult): string | null {
  const bits: string[] = [];
  if (r.subtitle) bits.push(r.subtitle);
  if (r.price != null) bits.push(`from ${formatPKR(r.price)}`);
  return bits.length ? bits.join(" · ") : null;
}

export function summarize(body: string, n = 140): string {
  return truncate(body, n);
}
