# Willow Weave — Setup & Go-Live Guide

The store already **runs completely on your machine with zero accounts** (local
mode): catalog from `data/`, orders saved to `data/dev/orders.json`, emails
printed to the terminal. Production needs four free accounts — about 15 minutes.

```
npm install
npm run dev        →  http://localhost:3000        (the store)
                      http://localhost:3000/admin  (the dashboard)
```

---

## 1 · Supabase (database + staff logins) — required for production

1. Create a free project at [supabase.com](https://supabase.com) (pick Singapore region — closest to Pakistan).
2. In the project: **SQL Editor → New query**, paste the whole of
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) and **Run**.
   Then do the same for every later file in `supabase/migrations/` in order
   (0002, 0003, …) — already-applied ones are safe to re-run.
3. **Settings → API**: copy three values into `.env.local`
   (copy `.env.example` → `.env.local` first):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret — server only)
4. Add your owner login to `.env.local`:
   ```
   ADMIN_EMAIL=ausatali27@gmail.com
   ADMIN_PASSWORD=choose-a-strong-password
   ```
5. Seed the database with the scraped catalog:
   ```
   npm run seed
   npm run verify     ← accuracy report: must print "PERFECT MATCH"
   ```
6. Restart `npm run dev` — the site now serves from Supabase and
   `/admin` requires your login.

> ⚠️ **Stock counts**: Shopify never publishes real quantities, so every
> in-stock variant was seeded with **stock = 10**. Fix the real numbers in
> **Admin → Inventory** on day one.

## 2 · Cloudinary (product images) — recommended

1. Free account at [cloudinary.com](https://cloudinary.com) → Dashboard shows your keys.
2. Fill in `.env.local`: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Upload the archived images and re-point the database at them:
   ```
   npm run cloudinary:upload
   npm run seed
   ```
   (Until you do this, the site shows images from Shopify's CDN — which works,
   but stops if you ever close the Shopify store. Cloudinary also powers
   drag-and-drop uploads in the product editor.)

> ⚠️ **Do this BEFORE editing anything in the dashboard.** `npm run seed`
> restores the original scraped catalog — it overwrites stock counts,
> product edits and settings changes you've made since. Once you start
> managing the store in the dashboard, don't re-run the seed.

## 3 · Resend (order emails) — recommended

1. Free account at [resend.com](https://resend.com) → **API Keys** → create one → `RESEND_API_KEY` in `.env.local`.
2. Quick start: keep `EMAIL_FROM="Willow Weave <onboarding@resend.dev>"` —
   Resend then only delivers to **your own** inbox (owner notifications work;
   customer confirmations don't).
3. Full setup: **Domains → Add domain** `willowweave.co`, add the DNS records
   Resend shows at your domain registrar, wait for "Verified", then set
   `EMAIL_FROM="Willow Weave <orders@willowweave.co>"`.
   Now customers get confirmation + shipped emails too.

## 4 · Vercel (hosting) — free

1. Push this folder to a GitHub repository.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo (defaults are fine).
3. Project → **Settings → Environment Variables**: add everything from your
   `.env.local`, plus:
   - `NEXT_PUBLIC_SITE_URL=https://willowweave.co`
   - `CRON_SECRET=<any long random string>` — powers the daily cron
     (already configured in `vercel.json`) that stops the free Supabase
     project from pausing after 7 idle days.
4. Deploy. Test everything on the `*.vercel.app` URL first.

> Vercel's free Hobby tier is formally for non-commercial use. It's the usual
> way to launch; if the store grows, Pro is $20/mo — still far below
> Shopify + apps. The code is standard Next.js and moves anywhere.

## 5 · Point willowweave.co at the new site (the cutover)

Only when you're happy with the Vercel preview:

1. Vercel project → **Settings → Domains** → add `willowweave.co` and `www.willowweave.co`.
2. At your domain registrar, replace the Shopify DNS records with what Vercel
   shows (an `A` record `76.76.21.21` for the apex + `CNAME` for `www`).
3. Wait for DNS to propagate (minutes to a few hours). Shopify keeps working
   until the switch completes — there is no downtime window.
4. After a week of smooth sailing, cancel the Shopify subscription. 🎉
   Product URLs (`/products/...`, `/collections/...`) are identical, so
   Google links and Instagram bios keep working.

---

## Day-to-day

| Task | Where |
|---|---|
| See new orders (also emailed to you) | Admin → Orders |
| Confirm / ship / deliver / cancel an order | Order page → status buttons (cancel restocks automatically; shipped emails the customer) |
| Print a packing slip | Order page → Packing slip |
| Fix stock counts | Admin → Inventory (type, press Enter) |
| Add / edit products, prices, sale prices, photos | Admin → Products |
| Organise collections | Admin → Collections |
| Create discount codes | Admin → Discounts |
| Edit the size charts | Admin → Size Charts |
| Delivery fee, free-shipping threshold, announcement bar, notification email | Admin → Settings |
| Invite employees (staff can't manage staff/settings) | Admin → Settings → Staff |

## If something looks wrong

- **Accuracy check**: `npm run verify` compares the database against the live
  Shopify site (run before you start editing products, or diffs are expected).
- **Fresh re-scrape** (if you change things on Shopify before cutover):
  `npm run scrape && npm run images:download && npm run extract`, then re-seed.
- **Local mode reset**: delete `data/dev/` — the store returns to the pristine
  scraped catalog.

## What lives where

```
data/raw/            untouched Shopify JSON + page HTML (permanent archive)
data/images/         every original product/collection/theme image
data/catalog.json    normalized catalog (what local mode + seeding use)
data/content.json    page copy, policies, socials, accordions
supabase/migrations/ the database schema — paste each file into the SQL editor
                     in order (0001, 0002, 0003…); all are re-runnable
scripts/             scrape · extract · images · cloudinary · seed · verify
```
