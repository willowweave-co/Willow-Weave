/**
 * Turns the raw scrape (data/raw/) into clean, app-ready data:
 *   data/catalog.json      — normalized products/variants/images/collections + memberships
 *   data/content.json      — page copy, policies, homepage sections, socials, accordions
 *   data/images/theme/     — logo, hero images, size-chart image (theme-level assets)
 *
 * Needs: npm i -D cheerio   (everything else is bare Node)
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const RAW = path.join(process.cwd(), "data", "raw");
const THEME_IMG = path.join(process.cwd(), "data", "images", "theme");
const BASE = "https://www.willowweave.co";
const UA = "WillowWeave-Migration/1.0 (store owner authorized rebuild)";

const readRaw = async (f) => JSON.parse(await readFile(path.join(RAW, f), "utf8"));
const readHtml = async (name) => readFile(path.join(RAW, "pages", `${name}.html`), "utf8");

/** Strip scripts/event handlers from user-content HTML; normalize nbsp. */
function cleanHtml(html) {
  if (!html) return "";
  const $ = cheerio.load(`<div id="__root">${html}</div>`, null, false);
  $("script, style, iframe").remove();
  $("*").each((_, el) => {
    for (const attr of Object.keys(el.attribs ?? {})) {
      if (attr.startsWith("on")) $(el).removeAttr(attr);
    }
  });
  return $("#__root").html().replaceAll(" ", " ").trim();
}

function textOf($, sel) {
  return $(sel).first().text().replaceAll(" ", " ").trim();
}

// ── Collection grouping (drives /collections page + nav) ────────────────────
const GROUPS = {
  volumes: ["volume-1", "volume-2", "winter-whispers", "volume-4-in-full-bloom", "volume-5-sun-kisses-threads"],
  occasions: ["eid-ul-adha-2026", "eid-ul-fitr-2026"],
  pieces: ["2-piece", "3-piece", "tops", "trousers"],
};
function groupOf(handle) {
  for (const [g, handles] of Object.entries(GROUPS)) if (handles.includes(handle)) return g;
  return "fabrics";
}

// ── Normalize catalog ────────────────────────────────────────────────────────
async function buildCatalog() {
  const products = await readRaw("products.json");
  const collections = await readRaw("collections.json");
  const membership = await readRaw("collection-products.json");
  const manifest = await readRaw("image-manifest.json");

  const localByUrl = new Map(manifest.images.map((i) => [i.url, i.local.replaceAll("\\", "/")]));

  const normProducts = products.map((p) => {
    const optNames = p.options.map((o) => o.name.toLowerCase());
    const sizeIdx = optNames.indexOf("size");
    const colorIdx = optNames.indexOf("color");
    const variants = p.variants.map((v) => {
      const opts = [v.option1, v.option2, v.option3];
      return {
        id: v.id,
        title: v.title,
        size: sizeIdx >= 0 ? opts[sizeIdx] : null,
        color: colorIdx >= 0 ? opts[colorIdx] : null,
        price: Number(v.price),
        compareAtPrice: v.compare_at_price ? Number(v.compare_at_price) : null,
        available: v.available,
        // Shopify's public JSON exposes availability, not quantities.
        // Seeded default — owner sets real counts in the dashboard.
        stock: v.available ? 10 : 0,
        sku: v.sku || null,
        position: v.position,
      };
    });
    const prices = variants.map((v) => v.price);
    const compares = variants.map((v) => v.compareAtPrice).filter(Boolean);
    const knownFabrics = ["lawn", "chiffon", "chiffon grip", "crinkle gauze", "dobby silk", "elastane", "georgette", "karandi", "lycra", "marina", "satin silk", "short silk", "silk", "velvet", "cotton", "cotton net"];
    const fabrics = [...new Set(
      p.tags
        .map((t) => t.trim())
        .filter((t) => knownFabrics.includes(t.toLowerCase()))
        .map((t) => t.split(" ").map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" "))
    )];
    return {
      id: p.id,
      handle: p.handle,
      title: p.title.replaceAll(" ", " ").trim(),
      descriptionHtml: cleanHtml(p.body_html),
      vendor: p.vendor,
      productType: p.product_type,
      tags: p.tags,
      fabrics,
      publishedAt: p.published_at,
      createdAt: p.created_at,
      options: p.options.map((o) => ({ name: o.name, values: o.values })),
      variants,
      images: p.images.map((img, i) => ({
        id: img.id,
        src: img.src,
        local: localByUrl.get(img.src) ?? null,
        width: img.width,
        height: img.height,
        position: i,
        alt: `${p.title} — view ${i + 1}`,
      })),
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      compareAtMax: compares.length ? Math.max(...compares) : null,
      available: variants.some((v) => v.available),
    };
  });

  const normCollections = collections
    .map((c, i) => ({
      id: c.id,
      handle: c.handle,
      title: c.title.trim(),
      description: cleanHtml(c.description ?? ""),
      imageSrc: c.image?.src ?? null,
      imageLocal: c.image?.src
        ? (manifest.images.find((im) => im.kind === "collection" && im.owner === c.handle)?.local ?? null)?.replaceAll?.("\\", "/") ?? null
        : null,
      group: groupOf(c.handle),
      position: i,
      publishedAt: c.published_at,
      productIds: (membership[c.handle] ?? []).map((m) => m.id),
    }))
    .sort((a, b) => a.position - b.position);

  return { products: normProducts, collections: normCollections };
}

// ── Extract page & policy content ───────────────────────────────────────────
async function extractPage(name) {
  const $ = cheerio.load(await readHtml(name));
  const main = $("main");
  const title = textOf($, "main h1, main h2, .shopify-policy__title h1") || textOf($, "title").split("–")[0].trim();
  // Page templates in this theme render copy inside rte-formatter / text blocks
  const bodyParts = [];
  main.find("rte-formatter, .rte").each((_, el) => {
    const html = cleanHtml($(el).html());
    if (html && !bodyParts.includes(html)) bodyParts.push(html);
  });
  return { title, bodyHtml: bodyParts.join("\n") };
}

async function extractPolicy(name) {
  const $ = cheerio.load(await readHtml(name));
  return {
    title: textOf($, ".shopify-policy__title"),
    bodyHtml: cleanHtml($(".shopify-policy__body").html()),
  };
}

// ── Homepage: sections, socials, theme assets ───────────────────────────────
async function extractHome() {
  const html = await readHtml("home");
  const $ = cheerio.load(html);

  const socials = {};
  $('a[href*="facebook.com"]').first().length && (socials.facebook = $('a[href*="facebook.com"]').first().attr("href"));
  $('a[href*="instagram.com"]').first().length && (socials.instagram = $('a[href*="instagram.com"]').first().attr("href"));
  $('a[href*="tiktok.com"]').first().length && (socials.tiktok = $('a[href*="tiktok.com"]').first().attr("href"));

  // Theme-level images (logo, heroes, size chart) live under /cdn/shop/files/
  const fileUrls = new Set();
  for (const m of html.matchAll(/\/\/www\.willowweave\.co\/cdn\/shop\/files\/[^"'\s?]+/g)) {
    fileUrls.add(`https:${m[0]}`);
  }

  const sizeChartText = cleanHtml(
    $("rte-formatter")
      .filter((_, el) => $(el).text().includes("Understanding the Size Charts"))
      .first()
      .html() ?? ""
  );

  return {
    heroHeadings: { newArrivals: "New Arrivals", bestsellers: "Bestsellers", featured: "Sun Kissed Threads", trending: "Trending" },
    sizeChartSection: { heading: "Key Detail About Size Charts", bodyHtml: sizeChartText },
    socials,
    themeAssetUrls: [...fileUrls],
  };
}

// ── Store-wide product accordions (Care / Design) from a live product page ──
async function extractAccordions() {
  const res = await fetch(`${BASE}/products/tea-pink-embroidered-3-piece-set`, { headers: { "User-Agent": UA } });
  if (!res.ok) return {};
  const $ = cheerio.load(await res.text());
  const accordions = {};
  $("details").each((_, el) => {
    const label = $(el).find("summary").first().text().trim();
    const body = $(el).clone();
    body.find("summary").remove();
    const html = cleanHtml(body.html());
    if (label && html && ["care", "design"].includes(label.toLowerCase())) {
      accordions[label.toLowerCase()] = { label, bodyHtml: html };
    }
  });
  return accordions;
}

// ── Theme asset download (archived in data/images/theme/ ONLY) ──────────────
// public/theme/ is a small curated set, hand-optimized with sharp — do NOT
// copy the raw downloads there (they're large and bloat git/Vercel).
async function downloadThemeAssets(urls) {
  await mkdir(THEME_IMG, { recursive: true });
  const saved = {};
  for (const url of urls) {
    const name = path.basename(new URL(url).pathname).replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = path.join(THEME_IMG, name);
    let ok = true;
    try {
      await access(dest);
    } catch {
      ok = false;
      // Hero/banner assets can be enormous originals — let the Shopify CDN
      // resize to a sane maximum so public/ stays lean.
      const fetchUrl = `${url}?width=2400`;
      for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
        try {
          const res = await fetch(fetchUrl, { headers: { "User-Agent": UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await writeFile(dest, Buffer.from(await res.arrayBuffer()));
          ok = true;
        } catch (e) {
          console.warn(`  ${name} attempt ${attempt}: ${e.message}`);
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }
    if (!ok) { console.warn(`  SKIPPED ${name}`); continue; }
    saved[name] = { url, local: `data/images/theme/${name}` };
  }
  return saved;
}

async function main() {
  console.log("→ normalizing catalog");
  const catalog = await buildCatalog();
  console.log(`  ${catalog.products.length} products, ${catalog.collections.length} collections`);

  console.log("→ extracting pages & policies");
  const [about, philosophy] = await Promise.all([extractPage("about-us"), extractPage("philosophy-behind-logo")]);
  const policies = {
    "privacy-policy": await extractPolicy("policy-privacy"),
    "refund-policy": await extractPolicy("policy-refund"),
    "terms-of-service": await extractPolicy("policy-terms"),
    "shipping-policy": await extractPolicy("policy-shipping"),
    "contact-information": await extractPolicy("policy-contact"),
  };

  console.log("→ extracting homepage content");
  const home = await extractHome();

  console.log("→ extracting product-page accordions (live fetch)");
  const accordions = await extractAccordions();
  console.log(`  accordions: ${Object.keys(accordions).join(", ") || "none found"}`);

  console.log("→ downloading theme assets");
  const themeAssets = await downloadThemeAssets(home.themeAssetUrls);
  console.log(`  ${Object.keys(themeAssets).length} assets`);

  await writeFile(
    path.join(process.cwd(), "data", "catalog.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), source: BASE, ...catalog }, null, 2)
  );
  await writeFile(
    path.join(process.cwd(), "data", "content.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pages: { about, philosophy },
        policies,
        home: { heroHeadings: home.heroHeadings, sizeChartSection: home.sizeChartSection },
        socials: home.socials,
        accordions,
        themeAssets,
      },
      null,
      2
    )
  );
  console.log("✓ data/catalog.json + data/content.json written");
}

main().catch((e) => { console.error(e); process.exit(1); });
