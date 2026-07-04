/**
 * ACCURACY REPORT — diffs the live Shopify store against what the new site
 * serves (Supabase when configured, otherwise the local data/catalog.json).
 *
 * Compares every product's title, handle, type, tags, description text,
 * variant matrix (size/color/price/compare-at/availability), image count,
 * plus every collection's title, image and ordered membership.
 *
 * Expected, by design (not counted as failures):
 *   - stock QUANTITIES (Shopify only exposes in/out of stock; we seed 10/0)
 *   - image URLs when migrated to Cloudinary (count + order are compared)
 * Run this right after seeding, before editing anything in the dashboard.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();
const BASE = "https://www.willowweave.co";
const UA = "WillowWeave-Migration/1.0 (store owner authorized rebuild)";

const strip = (html) =>
  (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function fetchAll(pathname, key) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const sep = pathname.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${pathname}${sep}limit=250&page=${page}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`${pathname} → HTTP ${res.status}`);
    const items = (await res.json())[key] ?? [];
    all.push(...items);
    if (items.length < 250) break;
  }
  return all;
}

/** Load "ours" from Supabase (preferred) or local catalog.json. */
async function loadOurs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && service) {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(url, service, { auth: { persistSession: false } });
    const [{ data: products, error: e1 }, { data: collections, error: e2 }] = await Promise.all([
      db.from("products").select("*, product_images(*), product_variants(*)"),
      db.from("collections").select("*, product_collections(product_id, position)"),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2).message);
    return {
      source: "Supabase",
      products: products.map((p) => ({
        handle: p.handle,
        title: p.title,
        type: p.product_type,
        tags: p.tags ?? [],
        description: strip(p.description_html),
        images: (p.product_images ?? []).length,
        variants: [...(p.product_variants ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((v) => ({
            size: v.size,
            color: v.color,
            price: Number(v.price),
            compareAt: v.compare_at_price != null ? Number(v.compare_at_price) : null,
            available: v.stock > 0,
          })),
      })),
      collections: collections.map((c) => ({
        handle: c.handle,
        title: c.title,
        hasImage: !!c.image_url,
        memberIds: [...(c.product_collections ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((m) => Number(m.product_id)),
      })),
    };
  }

  const catalog = JSON.parse(
    await readFile(path.join(process.cwd(), "data", "catalog.json"), "utf8")
  );
  return {
    source: "local data/catalog.json",
    products: catalog.products.map((p) => ({
      handle: p.handle,
      title: p.title,
      type: p.productType,
      tags: p.tags,
      description: strip(p.descriptionHtml),
      images: p.images.length,
      variants: p.variants.map((v) => ({
        size: v.size,
        color: v.color,
        price: v.price,
        compareAt: v.compareAtPrice,
        available: v.stock > 0,
      })),
    })),
    collections: catalog.collections.map((c) => ({
      handle: c.handle,
      title: c.title,
      hasImage: !!c.imageSrc,
      memberIds: c.productIds.map(Number),
    })),
  };
}

function normalizeLiveVariant(v, options) {
  const names = options.map((o) => o.name.toLowerCase());
  const opts = [v.option1, v.option2, v.option3];
  const sizeIdx = names.indexOf("size");
  const colorIdx = names.indexOf("color");
  return {
    size: sizeIdx >= 0 ? opts[sizeIdx] : null,
    color: colorIdx >= 0 ? opts[colorIdx] : null,
    price: Number(v.price),
    compareAt: v.compare_at_price != null ? Number(v.compare_at_price) : null,
    available: v.available,
  };
}

async function main() {
  console.log("Fetching live Shopify catalog…");
  const [liveProducts, liveCollections] = await Promise.all([
    fetchAll("/products.json", "products"),
    fetchAll("/collections.json", "collections"),
  ]);
  const liveMembership = {};
  for (const c of liveCollections) {
    liveMembership[c.handle] = (await fetchAll(`/collections/${c.handle}/products.json`, "products")).map(
      (p) => p.id
    );
  }

  const ours = await loadOurs();
  console.log(`Comparing against: ${ours.source}\n`);

  const issues = [];
  const oursByHandle = new Map(ours.products.map((p) => [p.handle, p]));

  // ── products ──
  if (liveProducts.length !== ours.products.length) {
    issues.push(`Product count: live ${liveProducts.length} vs ours ${ours.products.length}`);
  }
  for (const lp of liveProducts) {
    const op = oursByHandle.get(lp.handle);
    if (!op) {
      issues.push(`MISSING product: ${lp.handle}`);
      continue;
    }
    if (op.title !== lp.title.replace(/ /g, " ").trim())
      issues.push(`${lp.handle}: title "${op.title}" ≠ live "${lp.title}"`);
    if (op.type !== lp.product_type)
      issues.push(`${lp.handle}: type "${op.type}" ≠ live "${lp.product_type}"`);
    const liveTags = [...lp.tags].sort().join("|");
    const ourTags = [...op.tags].sort().join("|");
    if (liveTags !== ourTags) issues.push(`${lp.handle}: tags [${ourTags}] ≠ live [${liveTags}]`);
    if (op.images !== lp.images.length)
      issues.push(`${lp.handle}: ${op.images} images ≠ live ${lp.images.length}`);
    const liveDesc = strip(lp.body_html);
    if (op.description !== liveDesc)
      issues.push(`${lp.handle}: description text differs (${op.description.length} vs ${liveDesc.length} chars)`);
    if (op.variants.length !== lp.variants.length) {
      issues.push(`${lp.handle}: ${op.variants.length} variants ≠ live ${lp.variants.length}`);
      continue;
    }
    lp.variants.forEach((lv, i) => {
      const nl = normalizeLiveVariant(lv, lp.options);
      const ov = op.variants[i];
      for (const key of ["size", "color", "price", "compareAt", "available"]) {
        if (JSON.stringify(ov[key]) !== JSON.stringify(nl[key])) {
          issues.push(
            `${lp.handle} variant ${i + 1} (${nl.size ?? nl.color}): ${key} ${JSON.stringify(ov[key])} ≠ live ${JSON.stringify(nl[key])}`
          );
        }
      }
    });
  }
  for (const op of ours.products) {
    if (!liveProducts.some((lp) => lp.handle === op.handle)) {
      issues.push(`EXTRA product not on live site: ${op.handle} (fine if added via dashboard)`);
    }
  }

  // ── collections ──
  const oursCollByHandle = new Map(ours.collections.map((c) => [c.handle, c]));
  if (liveCollections.length !== ours.collections.length) {
    issues.push(`Collection count: live ${liveCollections.length} vs ours ${ours.collections.length}`);
  }
  for (const lc of liveCollections) {
    const oc = oursCollByHandle.get(lc.handle);
    if (!oc) {
      issues.push(`MISSING collection: ${lc.handle}`);
      continue;
    }
    if (oc.title !== lc.title.trim()) issues.push(`${lc.handle}: title "${oc.title}" ≠ live "${lc.title}"`);
    if (oc.hasImage !== !!lc.image?.src) issues.push(`${lc.handle}: image presence differs`);
    const liveIds = liveMembership[lc.handle] ?? [];
    if (JSON.stringify(oc.memberIds) !== JSON.stringify(liveIds)) {
      issues.push(
        `${lc.handle}: membership differs (ours ${oc.memberIds.length} vs live ${liveIds.length}, or order changed)`
      );
    }
  }

  // ── report ──
  const counts = {
    products: liveProducts.length,
    variants: liveProducts.reduce((n, p) => n + p.variants.length, 0),
    images: liveProducts.reduce((n, p) => n + p.images.length, 0),
    collections: liveCollections.length,
  };
  console.log("═".repeat(60));
  console.log("ACCURACY REPORT — live willowweave.co vs new site");
  console.log("═".repeat(60));
  console.log(`Checked: ${counts.products} products · ${counts.variants} variants · ${counts.images} images · ${counts.collections} collections`);
  if (issues.length === 0) {
    console.log("\n✅ PERFECT MATCH — zero differences.");
  } else {
    console.log(`\n❌ ${issues.length} difference(s):\n`);
    issues.forEach((d) => console.log(`  • ${d}`));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
