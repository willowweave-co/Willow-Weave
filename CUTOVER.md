# Go-live cutover — willowweave.co (Shopify → this app)

> **STATUS: EXECUTED (~July 2026).** willowweave.co is live on Vercel. This doc is
> kept as the record of what was done and — most importantly — the **Phase 5
> rollback** values, in case the domain ever needs to point back at Shopify.

Point the real domain at the new store on Vercel, replacing the old Shopify
site, without breaking orders or email. Do the phases **in order**. Nothing here
is irreversible until Phase 3, and Phase 5 is the rollback if anything looks wrong.

**Who does what:** every step below is a dashboard action in *your* accounts
(Namecheap, Vercel, Resend). Claude can't click those, but can verify each step —
after each ✅ check, ask Claude to confirm it landed before moving on.

---

## Current state (your rollback target — do not lose this)

DNS is at **Namecheap** (nameservers `dns1.registrar-servers.com` /
`dns2.registrar-servers.com`). The domain currently points at **Shopify**:

| Host | Type | Current value (Shopify) |
|------|------|-------------------------|
| `@` (apex) | A | `23.227.38.65` |
| `www` | CNAME | `shops.myshopify.com` |

Screenshot the Namecheap **Advanced DNS** page before changing anything.

---

## Phase 0 — Pre-flight (prove readiness). DO NOT SKIP.

### 0.1 Email — ALREADY WORKING ✅
`willowweave.co` is verified in Resend and `EMAIL_FROM =
Willow Weave <orders@willowweave.co>` sends successfully — confirmed by real
test orders delivering both the customer confirmation and the owner alert.
(The `RESEND_API_KEY` is a send-only key, so it can't be used to *list* domains
via the API — verification status can only be eyeballed in the Resend
dashboard, but the successful sends already prove it.) Nothing to do here.

### 0.2 From-address — matches, no change
`EMAIL_FROM` uses the verified domain. Leave as-is.

### 0.3 Point the app's own URL at the domain (Vercel env)
Vercel → project → **Settings → Environment Variables** → set
`NEXT_PUBLIC_SITE_URL` = `https://www.willowweave.co` for **Production**
(and Preview). Redeploy so it takes effect. (Until now it's the `.vercel.app` URL.)

### 0.4 Real end-to-end test order (on the current .vercel.app URL is fine)
Place a genuine order through the storefront. Confirm:
- ✅ the **customer** confirmation email arrives (use a real inbox as the email),
- ✅ the **owner** alert arrives at `willowweave.co@gmail.com`,
- ✅ the order shows in **Admin → Orders**.
→ *Ask Claude to confirm the order landed in the database._

### 0.5 Sanity-check inventory ✅
Real stock numbers were set in **Admin → Inventory** before launch. (If you ever
re-run this process, re-verify the stock spread first — never `npm run seed`,
which restores the scraped snapshot.) → *Ask Claude to re-check._

**Do not proceed past Phase 0 until 0.4 (a real order lands cleanly) and 0.5
(inventory is accurate) are done. Email (0.1) is already confirmed.**

---

## Phase 1 — Add the domain in Vercel (no DNS change yet)

1. Vercel → project → **Settings → Domains** → add **`www.willowweave.co`** and
   **`willowweave.co`**.
2. Set **`www.willowweave.co` as primary**; let Vercel redirect the apex → www
   (matches `NEXT_PUBLIC_SITE_URL`).
3. Vercel now shows the **exact DNS records it wants**. What it showed for this
   project (July 2026):
   - apex `@` → **A** `216.198.79.1`
   - `www` → **CNAME** `c7aee5ab327ab091.vercel-dns-017.com`
   **Always use whatever Vercel actually displays** — it's authoritative and can
   differ per project and over time (Vercel's older generic values were
   `76.76.21.21` and `cname.vercel-dns.com`). Vercel says "Invalid
   Configuration" until Phase 2; that's expected.

---

## Phase 2 — The cutover (change DNS at Namecheap)

This is the moment the domain starts serving the new store. Propagation is
usually minutes (Namecheap TTL is often 30 min; you can lower TTL an hour ahead
to speed it).

In **Namecheap → Advanced DNS**:
1. **apex A record** (Host `@`): change value `23.227.38.65` → the Vercel A value
   (`216.198.79.1` — or whatever Vercel shows).
2. **www CNAME** (Host `www`): change `shops.myshopify.com` → the Vercel CNAME
   (`c7aee5ab327ab091.vercel-dns-017.com` — or whatever Vercel shows).
3. **Leave the Resend records from Phase 0 in place.**
4. Remove any leftover Shopify-only records (e.g. a Shopify verification TXT) —
   but **keep** anything unrelated (Resend, other subdomains).

→ *Ask Claude to watch DNS propagation (nslookup) and tell you when it's live._

---

## Phase 3 — Verify the live domain

- ✅ `nslookup willowweave.co` shows the Vercel IP (not `23.227.38.65`).
- ✅ Vercel Domains shows **Valid Configuration** + SSL certificate issued.
- ✅ `https://www.willowweave.co` loads the storefront; `https://willowweave.co`
  redirects to it.
- ✅ `/admin` shows the login page.
- ✅ Security headers present (Claude can curl and confirm CSP/HSTS).
- ✅ Place **one real order on the live domain**; confirm both emails again.

→ *Ask Claude to run the full live check (pages, headers, and confirm the order)._

---

## Phase 4 — Post-cutover

- Confirm `NEXT_PUBLIC_SITE_URL` = `https://www.willowweave.co` (Phase 0.3) and
  that emails/sitemap now use the real domain.
- In **Shopify**: don't cancel it the same hour — keep it until the new store has
  taken real orders cleanly for a day or two, then wind it down. Once DNS is off
  Shopify, the Shopify storefront is no longer reachable at this domain anyway.
- Keep an eye on **Admin → Orders** and your inbox for the first live orders.

---

## Phase 5 — Rollback (if anything looks wrong)

Revert the two records in Namecheap → Advanced DNS:

| Host | Type | Back to (Shopify) |
|------|------|-------------------|
| `@` | A | `23.227.38.65` |
| `www` | CNAME | `shops.myshopify.com` |

Within one TTL the domain serves Shopify again. The Resend records and the
Vercel domain config can stay — they do no harm and save re-doing the work.
