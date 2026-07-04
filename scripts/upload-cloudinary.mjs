/**
 * Uploads every archived catalog image (data/images/) to Cloudinary and writes
 * data/cloudinary-map.json mapping original Shopify CDN URLs → Cloudinary URLs.
 * Safe to re-run: already-mapped images are skipped (resume support).
 *
 * Needs CLOUDINARY_* env vars (see .env.example). Run BEFORE `npm run seed`
 * so the database is seeded with Cloudinary URLs.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./env.mjs";
import { v2 as cloudinary } from "cloudinary";

loadEnv();

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
if (!CLOUD || !KEY || !SECRET) {
  console.error("Missing Cloudinary env vars (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
  process.exit(1);
}
cloudinary.config({ cloud_name: CLOUD, api_key: KEY, api_secret: SECRET, secure: true });

const MAP_FILE = path.join(process.cwd(), "data", "cloudinary-map.json");
const CONCURRENCY = 4;

async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(process.cwd(), "data", "raw", "image-manifest.json"), "utf8")
  );
  let map = {};
  try {
    map = JSON.parse(await readFile(MAP_FILE, "utf8")).map ?? {};
  } catch { /* first run */ }

  const jobs = manifest.images.filter((img) => !map[img.url]);
  console.log(`${manifest.images.length} images total, ${jobs.length} to upload…`);

  let done = 0;
  const failed = [];
  const queue = [...jobs];

  async function worker() {
    while (queue.length) {
      const img = queue.shift();
      const local = path.join(process.cwd(), img.local);
      const publicId =
        img.kind === "product"
          ? `willow-weave/products/${img.owner}/${String(img.position + 1).padStart(2, "0")}`
          : `willow-weave/collections/${img.owner}`;
      try {
        const res = await cloudinary.uploader.upload(local, {
          public_id: publicId,
          overwrite: false,
          resource_type: "image",
        });
        map[img.url] = res.secure_url;
        done++;
        if (done % 20 === 0) {
          console.log(`  ${done}/${jobs.length}`);
          await writeFile(MAP_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), map }, null, 2));
        }
      } catch (e) {
        failed.push({ url: img.url, error: e.message });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeFile(MAP_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), map }, null, 2));
  console.log(`✓ ${done} uploaded, ${Object.keys(map).length} mapped total${failed.length ? `, ${failed.length} FAILED` : ""}`);
  if (failed.length) {
    console.error(failed.slice(0, 10));
    process.exit(1);
  }
  console.log("→ now run: npm run seed   (re-seeding switches the DB to Cloudinary URLs)");
}

main().catch((e) => { console.error(e); process.exit(1); });
