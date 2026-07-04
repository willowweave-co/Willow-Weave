/**
 * Scrapes the live Shopify store (willowweave.co) into data/raw/.
 * Zero-dependency: bare Node 18+ (fetch). Structured JSON endpoints are used
 * wherever Shopify exposes them so catalog accuracy is exact, not parsed.
 *
 * Outputs:
 *   data/raw/products.json               — full product objects (all pages)
 *   data/raw/collections.json            — all custom+smart collections
 *   data/raw/collection-products.json    — { [collectionHandle]: [{id, handle, position}] }
 *   data/raw/pages/<name>.html           — raw HTML of static pages/policies/homepage
 *   data/raw/scrape-meta.json            — timestamps + counts for the verify step
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://www.willowweave.co";
const OUT = path.join(process.cwd(), "data", "raw");
const UA = "WillowWeave-Migration/1.0 (store owner authorized rebuild)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, { asJson = true, tries = 4 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: asJson ? "application/json" : "text/html" } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true, body: asJson ? await res.json() : await res.text() };
    } catch (err) {
      if (attempt === tries) throw new Error(`Failed ${url}: ${err.message}`);
      await sleep(700 * attempt);
    }
  }
}

/** Paginate a Shopify .json listing endpoint until an empty page. */
async function fetchAllPages(pathname, key) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const sep = pathname.includes("?") ? "&" : "?";
    const { ok, body, status } = await fetchWithRetry(`${BASE}${pathname}${sep}limit=250&page=${page}`);
    if (!ok) throw new Error(`${pathname} page ${page} -> HTTP ${status}`);
    const items = body[key] ?? [];
    all.push(...items);
    if (items.length < 250) break;
    await sleep(350);
  }
  return all;
}

async function main() {
  await mkdir(path.join(OUT, "pages"), { recursive: true });

  console.log("→ products.json (paginated)");
  const products = await fetchAllPages("/products.json", "products");
  console.log(`  ${products.length} products`);

  console.log("→ collections.json (paginated)");
  const collections = await fetchAllPages("/collections.json", "collections");
  console.log(`  ${collections.length} collections`);

  console.log("→ per-collection membership");
  const membership = {};
  for (const c of collections) {
    const items = await fetchAllPages(`/collections/${c.handle}/products.json`, "products");
    membership[c.handle] = items.map((p, i) => ({ id: p.id, handle: p.handle, position: i }));
    console.log(`  ${c.handle}: ${items.length}`);
    await sleep(250);
  }

  console.log("→ static pages, policies, homepage HTML");
  const htmlTargets = {
    "home": "/",
    "about-us": "/pages/about-us",
    "philosophy-behind-logo": "/pages/philosophy-behind-logo",
    "policy-privacy": "/policies/privacy-policy",
    "policy-refund": "/policies/refund-policy",
    "policy-terms": "/policies/terms-of-service",
    "policy-shipping": "/policies/shipping-policy",
    "policy-contact": "/policies/contact-information",
    "search-page": "/search",
  };
  const pageStatus = {};
  for (const [name, p] of Object.entries(htmlTargets)) {
    const r = await fetchWithRetry(`${BASE}${p}`, { asJson: false });
    pageStatus[name] = r.ok ? 200 : r.status;
    if (r.ok) await writeFile(path.join(OUT, "pages", `${name}.html`), r.body, "utf8");
    console.log(`  ${name}: ${pageStatus[name]}`);
    await sleep(250);
  }

  await writeFile(path.join(OUT, "products.json"), JSON.stringify(products, null, 2));
  await writeFile(path.join(OUT, "collections.json"), JSON.stringify(collections, null, 2));
  await writeFile(path.join(OUT, "collection-products.json"), JSON.stringify(membership, null, 2));
  await writeFile(
    path.join(OUT, "scrape-meta.json"),
    JSON.stringify(
      {
        scrapedAt: new Date().toISOString(),
        base: BASE,
        counts: {
          products: products.length,
          collections: collections.length,
          variants: products.reduce((n, p) => n + p.variants.length, 0),
          productImages: products.reduce((n, p) => n + p.images.length, 0),
        },
        pageStatus,
      },
      null,
      2
    )
  );
  console.log("✓ scrape complete → data/raw/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
