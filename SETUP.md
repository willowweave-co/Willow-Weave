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

   > **If you have an existing database, `0009_security_hardening.sql` is not
   > optional.** It stops the anon key from reading unpublished products'
   > prices, stock and images; restricts the traffic analytics to staff; hides
   > your notification email; and adds the policy that lets an owner delete an
   > order. Until it's run, "Delete order" will refuse to work, and the leaks
   > it closes are live.
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
   `/admin` requires your login: **password, then a 6-digit code emailed to
   you** (two-factor). The password is checked on the server and no session is
   issued until the code is confirmed, so a stolen password on its own gets
   nobody in.

   > Two things this depends on, both of which fail closed rather than letting
   > a password through alone:
   > - `0013_admin_login_2fa.sql` must be applied (it's in the migration run
   >   above). Until then sign-in stops at *"two-step sign-in isn't ready on
   >   this deployment"*.
   > - `RESEND_API_KEY` must be set and working — see §3.
   >
   > In local dev with no `RESEND_API_KEY`, the code is printed to the terminal
   > instead, so the flow stays testable.

7. **Turn off public sign-ups** (do this before going live).
   **Authentication → Sign In / Providers** → on the page itself (NOT inside
   the Email dialog) find the **User Signups** card → turn off
   *"Allow new users to sign up"*.

   > Do **not** touch *"Enable email provider"* inside the Email dialog. Its
   > description also says "sign up", but it controls email auth entirely —
   > turning it off locks every staff member out of the dashboard.

   Staff accounts are created by the owner in **Admin → Settings**, so nobody
   should be able to self-register. Left on, anyone can create a Supabase
   account with the (public) anon key — they still can't read the store's data,
   but it's an open door with no reason to exist.

8. **Password rules** — **Authentication → Sign In / Providers → Email**:
   set **Minimum password length = 8** (matches what the dashboard's own
   account form enforces, so the two can't disagree).

   *"Prevent use of leaked passwords"* (the HaveIBeenPwned check) is **Pro-plan
   only** — it can't be enabled on the free tier. Skip it. What covers you
   instead: sign-ups are off (step 7), accounts are invite-only, and the temp
   passwords the owner hands out are 12 random characters.

   Leave *"Secure password change"* and *"Require current password when
   updating"* **off**. The app already refuses to change an email or password
   without the current password (`updateAccountAction`); these enforce the same
   rule at the Supabase layer using a nonce/reauthentication flow the app
   doesn't currently implement, so enabling them would break the account form.

9. **Enable "RLS on all new tables"** if Supabase offers it — every existing
   table already has RLS on, and this stops a future one from being created
   world-readable by accident. (Reminder: RLS on + no policies = deny all, so a
   new table won't be readable until you write a policy for it.)

> ⚠️ **Stock counts**: Shopify never publishes real quantities, so every
> in-stock variant was seeded with **stock = 10**. Fix the real numbers in
> **Admin → Inventory** on day one.

> 🔒 **Rate limiting**: the app throttles checkout, discount-code checks,
> search and the traffic beacon in-process (`lib/rate-limit.ts`), which stops
> the cheap attacks. For a real perimeter, also enable Vercel's firewall rate
> limiting (**Project → Firewall**) on `/api/*` — that runs at the edge, before
> a request ever reaches a function.

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

## 3 · Resend (order emails + dashboard sign-in codes) — required for production

1. Free account at [resend.com](https://resend.com) → **API Keys** → create one → `RESEND_API_KEY` in `.env.local`.

   > 🔑 **This is a login dependency, not just an email one.** Signing in to
   > `/admin` needs a 6-digit code delivered by Resend (see §1 step 6). With no
   > key — or during a Resend/DNS outage — sign-in fails closed and **nobody,
   > including you, can reach the dashboard**. That is deliberate: the
   > alternative is letting a stolen password straight in. If you're ever locked
   > out because the domain's DNS is broken, temporarily set
   > `EMAIL_FROM="Willow Weave <onboarding@resend.dev>"` in Vercel and redeploy —
   > that delivers to the Resend account owner's inbox without needing your
   > domain's records.
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
2. At your domain registrar, replace the Shopify DNS records with **whatever
   Vercel actually shows on that Domains page** — it is authoritative, differs
   per project, and changes over time. What it showed for this project:
   - apex `@` → **A** `216.198.79.1`
   - `www` → **CNAME** `c7aee5ab327ab091.vercel-dns-017.com`

   > Vercel's older generic values were `76.76.21.21` and `cname.vercel-dns.com`.
   > They still appear in a lot of tutorials. Don't "correct" a working record
   > back to them — copy what the Vercel dashboard displays.
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
| Watch live visitors + traffic sources | Admin → Overview → Live traffic (needs migration `0004_traffic.sql` run once in the Supabase SQL editor) |
| Confirm / ship / deliver / cancel an order | Order page → status buttons (cancel restocks automatically; shipped emails the customer) |
| Print a packing slip | Order page → Packing slip |
| Fix stock counts | Admin → Inventory (type, press Enter) |
| Add / edit products, prices, sale prices, photos | Admin → Products |
| Organise collections | Admin → Collections |
| Create discount codes | Admin → Discounts |
| Edit the size charts | Admin → Size Charts |
| Delivery fee, free-shipping threshold, announcement bar, notification email | Admin → Settings |
| Invite employees (staff can't manage staff/settings) | Admin → Settings → Staff |

## Tracking your ads

The dashboard counts every visitor automatically (no Google Analytics needed).
To see **which ad** brought them, add UTM tags to the link you put in the ad:

```
https://willowweave.co/?utm_source=instagram&utm_campaign=eid-lawn-drop
https://willowweave.co/collections/new-arrivals?utm_source=facebook&utm_campaign=july-sale
```

- `utm_source` = where you posted it (instagram, facebook, tiktok, whatsapp…)
- `utm_campaign` = a name you choose for that specific ad

Visitors from those links show up by name under **Admin → Overview → Traffic
sources → Ad campaigns**, so you can compare which ads actually bring people.
Untagged visitors are grouped by the site that referred them (e.g.
`instagram.com`) or as `direct`.

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
