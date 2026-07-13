-- Owner-editable site pages (About, Philosophy, Contact intro, policies).
-- Rows are overrides: a page with no row falls back to the built-in copy
-- extracted from the old Shopify theme (data/content.json).
create table if not exists public.site_pages (
  handle text primary key,
  title text not null,
  body_html text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_pages enable row level security;

create policy "public read site pages" on public.site_pages
  for select using (true);
create policy "staff write site pages" on public.site_pages
  for all using (is_staff()) with check (is_staff());
