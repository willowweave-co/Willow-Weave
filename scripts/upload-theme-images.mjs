/**
 * Uploads the homepage hero images (originals in data/images/theme/) to
 * Cloudinary under willow-weave/theme/, so they get the same f_auto,q_auto
 * responsive delivery as the catalog images via lib/image-loader.ts.
 *
 * One-off: after running, point THEME_IMAGES in lib/content-constants.ts at
 * the printed URLs. Safe to re-run (overwrites the same public_ids).
 * Needs CLOUDINARY_* env vars (see .env.example).
 */
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

const HEROES = [
  { local: "DSC01739.jpg", publicId: "willow-weave/theme/hero-new-arrivals" },
  { local: "pomelli_photoshoot-2.png", publicId: "willow-weave/theme/hero-bestsellers" },
  { local: "pomelli_photoshoot-7_2.png", publicId: "willow-weave/theme/hero-featured" },
];

for (const { local, publicId } of HEROES) {
  const file = path.join(process.cwd(), "data", "images", "theme", local);
  const res = await cloudinary.uploader.upload(file, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });
  console.log(`${local} → ${res.secure_url}`);
}
