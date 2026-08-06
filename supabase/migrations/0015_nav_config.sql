-- Editable storefront navigation, managed in Admin → Store front → Menu.
--
-- Until now the header was hard-coded and its dropdown contents were derived
-- from published collections at render time. nav_config stores the owner's
-- arrangement instead: order, labels, and which entries show. NULL means
-- "follow the collections automatically", i.e. exactly the previous
-- behaviour — so this column being unset is a valid, supported state, not a
-- half-configured one.

alter table public.store_settings
  add column if not exists nav_config jsonb;

-- The storefront reads its header on every page, through the whitelisted
-- public view — a column missing here is invisible to shoppers while looking
-- perfectly fine in the dashboard, which is the exact failure 0011 was
-- written to fix. Recreated (not replaced) to stay consistent with how this
-- view has been maintained; publicSettingsRow() falls back to the older
-- column set for the moment it is absent.
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
    nav_config,
    homepage_collections,
    intl_shipping,
    bank_transfer
  from public.store_settings
  where id = 1;

-- re-stated so the file stands alone, as in 0009, 0011 and 0014
revoke all on public.store_settings_public from anon, authenticated, public;
grant select on public.store_settings_public to anon, authenticated;
