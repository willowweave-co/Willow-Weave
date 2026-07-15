# Willow Weave 🌿

The complete [willowweave.co](https://www.willowweave.co) store, rebuilt from
Shopify as a self-owned Next.js app: full storefront, Cash-on-Delivery
checkout, order emails, and a staff dashboard — hostable entirely on free
tiers (Vercel + Supabase + Cloudinary + Resend).

**→ [SETUP.md](SETUP.md) has the full go-live guide.**

## Quick start

```bash
npm install
npm run dev
```

- Store: http://localhost:3000
- Dashboard: http://localhost:3000/admin

Runs with **zero accounts** out of the box (local mode): the catalog comes from
the scraped archive in `data/`, orders write to `data/dev/orders.json`, emails
print to the terminal. Connect the free services (see SETUP.md) to go to
production.

## What's inside

| Area | Details |
|---|---|
| Catalog | 51 products · 209 variants · 220 images · 23 collections, scraped 1:1 from the live Shopify store (verified — see `npm run verify`) |
| Storefront | Home with hero + site-wide typo-tolerant search (Ctrl K), grouped Collections, filterable `/products` catalog, product pages with size/colour/stock, size-chart modal + `/size-guide`, About/Philosophy/Contact/policy pages |
| Checkout | Cart drawer + cart page, discount codes, COD-only checkout with atomic stock decrement (no overselling), confirmation page, owner + customer emails |
| Dashboard `/admin` | Sales overview with 30-day revenue chart, orders (status pipeline, restock-on-cancel, shipped-email, packing slips), product CRUD with variant matrix + image uploads, inventory editor, collections, discounts, size-chart editor, settings, staff invites (owner/staff roles) |
| Data modes | `local` (JSON files, no accounts) ⇄ `supabase` (Postgres + RLS + auth) behind one interface — switched automatically by env vars |

## Scripts

```bash
npm run scrape             # re-scrape the live Shopify store → data/raw/
npm run images:download    # download every catalog image → data/images/
npm run extract            # normalize into data/catalog.json + content.json
npm run cloudinary:upload  # push images to Cloudinary (writes URL map)
npm run seed               # seed Supabase from the scraped catalog
npm run verify             # ACCURACY REPORT: live site vs new site
npm run typecheck          # tsc --noEmit
npm run build              # production build
```

## Stack

Next.js 16 (App Router, RSC) · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS)
· Cloudinary · Resend · Recharts · TypeScript. Images are resized by the
Shopify/Cloudinary CDNs via a custom loader, so Vercel's image quota is never
consumed.

## Maintainer notes (read before touching production)

Some of this app's security lives **outside the code**, configured by hand in
the Supabase dashboard. Reading the source alone will not reveal it, so if you
take over this project, know that:

- **The database schema is applied by running `supabase/migrations/*.sql` in
  order** in the Supabase SQL editor — including
  `0009_security_hardening.sql`, which is what stops the public (anon) key from
  reading unpublished products' prices/stock/images and hides the owner's
  notification email. If you point the app at a fresh Supabase project, every
  migration must be run or those protections don't exist. All are re-runnable.
- **Public sign-ups are turned OFF** in the dashboard (Authentication → Sign In
  / Providers → User Signups). Staff accounts are invite-only, created by the
  owner in Admin → Settings. Do not re-enable sign-ups.
- **Auth fails closed in production**: if the Supabase env vars are missing from
  a deployment, `/admin` is unavailable (not open). Set the env vars for
  Vercel's **Preview** environment as well as Production, or Preview deploys
  show "dashboard unavailable".
- **Supabase's advisor flags `store_settings_public` as a `SECURITY DEFINER`
  view.** That is intended — it exposes only non-sensitive settings columns to
  the storefront; see the comment in `0009_security_hardening.sql`. Not a bug to
  "fix".

Full go-live checklist, including these steps, is in **[SETUP.md](SETUP.md)**.
