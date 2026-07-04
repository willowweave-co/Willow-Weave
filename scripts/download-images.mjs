/**
 * Downloads every product + collection image referenced in data/raw/*.json
 * to data/images/, and writes data/raw/image-manifest.json mapping each
 * original CDN URL to its local file (used later by the Cloudinary uploader).
 * Zero-dependency; concurrency-limited to stay polite to the CDN.
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";

const RAW = path.join(process.cwd(), "data", "raw");
const IMG = path.join(process.cwd(), "data", "images");
const UA = "WillowWeave-Migration/1.0 (store owner authorized rebuild)";
const CONCURRENCY = 6;

function cleanName(src) {
  const u = new URL(src);
  return path.basename(u.pathname).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function download(url, dest) {
  if (await exists(dest)) return "cached";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error("suspiciously small file");
      await writeFile(dest, buf);
      return "downloaded";
    } catch (err) {
      if (attempt === 4) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function main() {
  const products = JSON.parse(await readFile(path.join(RAW, "products.json"), "utf8"));
  const collections = JSON.parse(await readFile(path.join(RAW, "collections.json"), "utf8"));

  /** @type {{url:string, local:string, kind:string, owner:string, position:number}[]} */
  const jobs = [];
  for (const p of products) {
    const dir = path.join(IMG, "products", p.handle);
    await mkdir(dir, { recursive: true });
    p.images.forEach((img, i) => {
      jobs.push({
        url: img.src,
        local: path.join("data", "images", "products", p.handle, `${String(i + 1).padStart(2, "0")}-${cleanName(img.src)}`),
        kind: "product", owner: p.handle, position: i,
      });
    });
  }
  await mkdir(path.join(IMG, "collections"), { recursive: true });
  for (const c of collections) {
    if (!c.image?.src) continue;
    jobs.push({
      url: c.image.src,
      local: path.join("data", "images", "collections", `${c.handle}-${cleanName(c.image.src)}`),
      kind: "collection", owner: c.handle, position: 0,
    });
  }

  console.log(`Downloading ${jobs.length} images with concurrency ${CONCURRENCY}…`);
  let done = 0, failed = [];
  const queue = [...jobs];
  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      try {
        await download(job.url, path.join(process.cwd(), job.local));
        done++;
        if (done % 25 === 0) console.log(`  ${done}/${jobs.length}`);
      } catch (e) {
        failed.push({ ...job, error: e.message });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeFile(path.join(RAW, "image-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), images: jobs, failed }, null, 2));
  console.log(`✓ ${done}/${jobs.length} images downloaded${failed.length ? `, ${failed.length} FAILED` : ""}`);
  if (failed.length) { console.error(failed); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
