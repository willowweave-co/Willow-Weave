-- Hero slideshow timing, editable from Admin → Homepage → Hero.
--
-- Was a hard-coded 6500ms constant in components/home/hero-slideshow.tsx.
-- Lives on the store_settings singleton beside hero_slides, so the whole hero
-- configuration reads and writes as one row.

alter table public.store_settings
  add column if not exists hero_interval_ms integer not null default 6500;

-- Guard rails so the carousel can't be configured into uselessness: under ~2s
-- nobody finishes reading a slide, over ~20s it reads as a static banner and
-- the later slides are effectively never seen. The UI offers 2–20s too; this
-- is the backstop for anything reaching the table another way.
alter table public.store_settings
  drop constraint if exists store_settings_hero_interval_ms_check;

alter table public.store_settings
  add constraint store_settings_hero_interval_ms_check
  check (hero_interval_ms between 2000 and 20000);

-- The storefront reads the hero through the whitelisted public view, so the
-- new column has to be added there or the shopper-facing side never sees it —
-- exactly the bug 0011 was written to fix for intl_shipping/bank_transfer.
--
-- DROP first, matching 0011: `create or replace view` can only append columns
-- at the end. Appending is all this migration does, so replace would in fact
-- work here — but drop+create keeps the file re-runnable and consistent with
-- how this view has been maintained. A view holds no data, and
-- publicSettingsRow() falls back to the older column set for the instant it
-- is absent.
drop view if exists public.store_settings_public;
create view public.store_settings_public as
  select
    id,
    store_name,
    shipping_fee,
    free_shipping_threshold,
    announcement,
    announcement_color,
    contact,
    hero_slides,
    hero_interval_ms,
    homepage_collections,
    intl_shipping,
    bank_transfer
  from public.store_settings
  where id = 1;

-- re-stated so the file stands alone, as in 0009 and 0011
revoke all on public.store_settings_public from anon, authenticated, public;
grant select on public.store_settings_public to anon, authenticated;
