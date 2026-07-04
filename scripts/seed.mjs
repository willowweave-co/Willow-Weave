/**
 * Seeds a fresh Supabase project with the scraped catalog:
 * size charts → collections → products (+images/variants) → memberships →
 * settings → identity sequences → (optionally) the owner login.
 *
 * Prereqs:
 *   1. supabase/migrations/0001_init.sql applied (SQL Editor or `supabase db push`)
 *   2. .env.local has NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   3. optional: run `npm run cloudinary:upload` first for Cloudinary image URLs
 *   4. optional: ADMIN_EMAIL (+ ADMIN_PASSWORD) in .env.local to create the owner
 *
 * Idempotent: upserts by primary key, so re-running is safe.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./env.mjs";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(URL, SERVICE, { auth: { persistSession: false } });

const read = async (f) => JSON.parse(await readFile(path.join(process.cwd(), "data", f), "utf8"));

function chartIdFor(productType) {
  return productType.toLowerCase().includes("trouser") ? 2 : 1;
}

async function must(promise, label) {
  const { error } = await promise;
  if (error) {
    console.error(`✗ ${label}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

async function main() {
  const catalog = await read("catalog.json");
  const charts = (await read("size-charts.json")).charts;
  let cloudinaryMap = {};
  try {
    cloudinaryMap = (await read("cloudinary-map.json")).map ?? {};
    console.log(`Using ${Object.keys(cloudinaryMap).length} Cloudinary URLs`);
  } catch {
    console.log("No cloudinary-map.json — seeding with original Shopify CDN URLs (still works).");
  }
  const url = (src) => cloudinaryMap[src] ?? src;

  // 1) size charts
  await must(
    db.from("size_charts").upsert(
      charts.map((c) => ({
        id: Number(c.id),
        name: c.name,
        applies_to: c.appliesTo,
        columns: c.columns,
        rows: c.rows,
        note: c.note,
      }))
    ),
    `size_charts (${charts.length})`
  );

  // 2) collections
  const FEATURED = new Set(["eid-ul-adha-2026", "volume-5-sun-kisses-threads"]);
  await must(
    db.from("collections").upsert(
      catalog.collections.map((c) => ({
        id: c.id,
        handle: c.handle,
        title: c.title,
        description_html: c.description ?? "",
        image_url: c.imageSrc ? url(c.imageSrc) : null,
        group: c.group,
        position: c.position,
        featured: FEATURED.has(c.handle),
        published: true,
      }))
    ),
    `collections (${catalog.collections.length})`
  );

  // 3) products
  await must(
    db.from("products").upsert(
      catalog.products.map((p) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        description_html: p.descriptionHtml,
        product_type: p.productType,
        fabrics: p.fabrics,
        tags: p.tags,
        vendor: p.vendor,
        published_at: p.publishedAt,
        created_at: p.createdAt,
        size_chart_id: chartIdFor(p.productType),
      }))
    ),
    `products (${catalog.products.length})`
  );

  // 4) images + variants
  const images = catalog.products.flatMap((p) =>
    p.images.map((img) => ({
      id: img.id,
      product_id: p.id,
      url: url(img.src),
      alt: img.alt,
      width: img.width,
      height: img.height,
      position: img.position,
    }))
  );
  await must(db.from("product_images").upsert(images), `product_images (${images.length})`);

  const variants = catalog.products.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      product_id: p.id,
      title: v.title,
      size: v.size,
      color: v.color,
      price: v.price,
      compare_at_price: v.compareAtPrice,
      stock: v.stock, // available→10 / unavailable→0 (Shopify hides real counts) — correct in the dashboard
      sku: v.sku,
      position: v.position,
    }))
  );
  await must(db.from("product_variants").upsert(variants), `product_variants (${variants.length})`);

  // 5) memberships (collection curation order)
  const memberships = catalog.collections.flatMap((c) =>
    c.productIds.map((pid, i) => ({ product_id: pid, collection_id: c.id, position: i }))
  );
  await must(db.from("product_collections").upsert(memberships), `product_collections (${memberships.length})`);

  // 6) settings
  await must(
    db
      .from("store_settings")
      .update({
        store_name: "Willow Weave",
        shipping_fee: 250,
        notify_email: process.env.ORDER_NOTIFY_EMAIL ?? "ausatali27@gmail.com",
      })
      .eq("id", 1),
    "store_settings"
  );

  // 7) identity sequences (so new admin-created rows get fresh ids)
  await must(db.rpc("reset_id_sequences"), "reset_id_sequences");

  // 8) owner account
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const password =
      process.env.ADMIN_PASSWORD ??
      `WW-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await db.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (error && !error.message.includes("already been registered")) {
      console.error(`✗ owner account: ${error.message}`);
    } else {
      const userId =
        data?.user?.id ??
        (await db.auth.admin.listUsers()).data.users.find((u) => u.email === adminEmail)?.id;
      if (userId) {
        await must(
          db.from("profiles").upsert({ id: userId, email: adminEmail, name: "Owner", role: "owner" }),
          "owner profile"
        );
        if (!process.env.ADMIN_PASSWORD && data?.user) {
          console.log(`\n★ Owner login created:\n  email:    ${adminEmail}\n  password: ${password}\n  (change it after first sign-in)`);
        }
      }
    }
  } else {
    console.log("\nℹ No ADMIN_EMAIL in .env.local — skip owner creation. Add it and re-run, or create a user in Supabase Auth and insert a row in profiles.");
  }

  console.log("\n✓ Seed complete. Start the app and the storefront now serves from Supabase.");
}

main().catch((e) => { console.error(e); process.exit(1); });
