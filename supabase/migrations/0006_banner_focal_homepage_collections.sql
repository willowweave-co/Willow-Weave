-- 1) Collection covers get a SECOND focal point for the wide banner on the
--    collection page. image_focal_* (0005) now means "tile focus" (homepage
--    tiles + collections index cards); banner_focal_* is the wide banner.
alter table public.collections
  add column if not exists banner_focal_x int check (banner_focal_x between 0 and 100),
  add column if not exists banner_focal_y int check (banner_focal_y between 0 and 100);

-- 2) Owner-curated "The Collections" section on the homepage: an ordered
--    jsonb array of up to 6 collection ids (slot 1 and 6 render wide).
--    null = automatic picks (the pre-existing behaviour).
alter table public.store_settings
  add column if not exists homepage_collections jsonb;
