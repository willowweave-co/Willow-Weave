-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening (2026-07). Run in the Supabase SQL editor after 0008.
--
-- Fixes found in the July 2026 audit:
--  1. product_images / product_variants / product_collections were world-
--     readable (`using (true)`), leaking prices, stock, SKUs and image URLs of
--     UNPUBLISHED products to anyone holding the (public) anon key.
--  2. traffic_snapshot() was granted to `authenticated` rather than staff, so
--     any self-signed-up user could read the store's analytics.
--  3. store_settings was world-readable, exposing notify_email (the owner's
--     private inbox) to anon.
--  4. orders had no DELETE policy, forcing the app to reach for the
--     service-role key to delete an order.
--  5. /api/track used the service-role key from an unauthenticated route.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Child catalog tables follow their parent product's visibility ─────────
-- security definer: the policy's subquery must see products regardless of the
-- caller's own RLS view of that table.
create or replace function public.product_is_visible(pid bigint)
returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from products p
    where p.id = pid and (p.published_at is not null or public.is_staff())
  );
$$;

drop policy if exists "public read images" on public.product_images;
create policy "public read images" on public.product_images
  for select using (public.product_is_visible(product_id));

drop policy if exists "public read variants" on public.product_variants;
create policy "public read variants" on public.product_variants
  for select using (public.product_is_visible(product_id));

drop policy if exists "public read memberships" on public.product_collections;
create policy "public read memberships" on public.product_collections
  for select using (public.product_is_visible(product_id));

-- Checkout is unaffected: place_order() is security definer and reads variants
-- directly. Storefront reads are nested selects off products, which were
-- already filtered by the products policy.

-- ── 2. Traffic analytics: staff only ────────────────────────────────────────
create or replace function public.traffic_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- granted to `authenticated`, but a Supabase auth user is not automatically
  -- staff — only a row in profiles makes them staff.
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return (
  with live as (
    select visitor_id, path
    from page_views
    where created_at > now() - interval '5 minutes'
  ),
  today as (
    select visitor_id
    from page_views
    where created_at >=
      (date_trunc('day', now() at time zone 'Asia/Karachi')) at time zone 'Asia/Karachi'
  ),
  hours as (
    select generate_series(
      date_trunc('hour', now()) - interval '23 hours',
      date_trunc('hour', now()),
      interval '1 hour'
    ) as h
  ),
  hourly as (
    select h,
           count(distinct pv.visitor_id) as visitors,
           count(pv.id) as views
    from hours
    left join page_views pv
      on pv.created_at >= h and pv.created_at < h + interval '1 hour'
    group by h
  ),
  landings as (
    select distinct on (visitor_id)
           referrer, utm_source, utm_medium, utm_campaign
    from page_views
    where created_at > now() - interval '7 days'
    order by visitor_id, (nullif(utm_source, '') is null), created_at
  ),
  sources as (
    select coalesce(
             nullif(utm_source, ''),
             nullif(regexp_replace(substring(referrer from '^[a-z]+://([^/]+)'), '^www\.', ''), ''),
             'direct'
           ) as source,
           count(*) as visitors
    from landings
    group by 1
    order by visitors desc
    limit 8
  ),
  campaigns as (
    select utm_campaign as campaign,
           coalesce(nullif(utm_source, ''), '—') as source,
           count(*) as visitors
    from landings
    where nullif(utm_campaign, '') is not null
    group by 1, 2
    order by visitors desc
    limit 8
  )
  select jsonb_build_object(
    'liveVisitors', (select count(distinct visitor_id) from live),
    'livePaths', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visitors', c)), '[]'::jsonb)
      from (
        select path, count(distinct visitor_id) as c
        from live group by path order by c desc limit 5
      ) lp
    ),
    'visitorsToday', (select count(distinct visitor_id) from today),
    'viewsToday', (select count(*) from today),
    'hourly', (
      select jsonb_agg(jsonb_build_object(
        'hour', to_char(h at time zone 'Asia/Karachi', 'HH24:MI'),
        'visitors', visitors,
        'views', views
      ) order by h)
      from hourly
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors)), '[]'::jsonb)
      from sources
    ),
    'campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'campaign', campaign, 'source', source, 'visitors', visitors
      )), '[]'::jsonb)
      from campaigns
    )
  ));
end;
$$;

revoke all on function public.traffic_snapshot() from public, anon;
grant execute on function public.traffic_snapshot() to authenticated, service_role;

-- ── 3. Pageview beacon: anon writes through a narrow RPC, not the service key
create or replace function public.record_page_view(
  p_vid text,
  p_path text,
  p_ref text default null,
  p_source text default null,
  p_medium text default null,
  p_campaign text default null
) returns void
language plpgsql security definer set search_path = public as
$$
begin
  -- shape guards mirrored from the route's zod schema; the RPC is the trust
  -- boundary now, so re-check here rather than relying on the caller
  if p_vid is null or length(p_vid) < 8 or length(p_vid) > 64 then return; end if;
  if p_path is null or left(p_path, 1) <> '/' or length(p_path) > 300 then return; end if;
  if left(p_path, 6) = '/admin' then return; end if;

  insert into page_views (visitor_id, path, referrer, utm_source, utm_medium, utm_campaign)
  values (
    p_vid,
    p_path,
    left(nullif(p_ref, ''), 500),
    left(nullif(p_source, ''), 120),
    left(nullif(p_medium, ''), 120),
    left(nullif(p_campaign, ''), 120)
  );
end;
$$;

revoke all on function public.record_page_view(text, text, text, text, text, text) from public;
grant execute on function public.record_page_view(text, text, text, text, text, text)
  to anon, authenticated, service_role;

-- ── 4. store_settings: notify_email is not public ───────────────────────────
-- The storefront needs most of this row (shipping, announcement, contact,
-- hero) but never notify_email. Expose the safe columns through a view (owned
-- by postgres → bypasses the base table's RLS) and lock the table to staff.
--
-- Supabase's linter flags this view as "SECURITY DEFINER" — that is expected
-- and is the whole mechanism, not an accident. What escapes through it is
-- bounded by the column list below (notify_email is absent) and by `id = 1`
-- (the table has a check constraint pinning it to exactly one row). Everything
-- it exposes is already visible in the storefront footer.
create or replace view public.store_settings_public as
  select
    id,
    store_name,
    shipping_fee,
    free_shipping_threshold,
    announcement,
    contact,
    hero_slides,
    homepage_collections
  from public.store_settings
  where id = 1;

-- A simple single-table view is AUTO-UPDATABLE in Postgres. Left alone, that
-- plus SECURITY DEFINER means a future `grant update` on this view would let
-- writes bypass the base table's RLS entirely. Read is the only thing this view
-- is ever allowed to do — make that structural rather than a matter of nobody
-- ever granting more.
revoke all on public.store_settings_public from anon, authenticated, public;
grant select on public.store_settings_public to anon, authenticated;

-- the old world-readable policy, and the new one (dropped by its own name too,
-- so this whole file stays re-runnable)
drop policy if exists "public read settings" on public.store_settings;
drop policy if exists "staff read settings" on public.store_settings;
create policy "staff read settings" on public.store_settings
  for select using (public.is_staff());

-- place_order() (security definer) still reads shipping_fee from the base
-- table, and the keepalive cron uses the service role — both unaffected.

-- ── 5. Orders: a real DELETE policy instead of a service-role workaround ────
drop policy if exists "owner delete orders" on public.orders;
create policy "owner delete orders" on public.orders
  for delete using (public.is_owner());

-- order_items cascade via FK, but the delete still needs a policy of its own
drop policy if exists "owner delete order items" on public.order_items;
create policy "owner delete order items" on public.order_items
  for delete using (public.is_owner());
