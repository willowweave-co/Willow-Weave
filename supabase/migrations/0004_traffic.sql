-- Storefront traffic tracking (Admin → Overview "Live traffic" section).
-- Raw pageviews land here via /api/track (service role); the dashboard reads
-- aggregates through traffic_snapshot() below. Rows older than 90 days are
-- purged by the daily keepalive cron.

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  path text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx
  on public.page_views (created_at desc);
create index if not exists page_views_visitor_idx
  on public.page_views (visitor_id, created_at);

-- No policies on purpose: only the service role writes (the /api/track route)
-- and reads happen through the security-definer function below. The anon key
-- can neither read nor write this table directly.
alter table public.page_views enable row level security;

-- One round-trip aggregate for the dashboard. "Today" and hour labels use
-- store time (Asia/Karachi). Staff-only: execute is granted to signed-in
-- users, and every staff login is an authenticated Supabase user.
create or replace function public.traffic_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
  -- one attribution row per visitor over the last 7 days; prefer their
  -- earliest UTM-tagged view so ad clicks get credited even for visitors
  -- who first arrived direct
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
  );
$$;

revoke all on function public.traffic_snapshot() from public, anon;
grant execute on function public.traffic_snapshot() to authenticated, service_role;
