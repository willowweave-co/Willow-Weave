-- Focal points: which part of an image stays in view when the storefront
-- crops it to a fixed aspect ratio (product cards 4:5, collection banners,
-- hero). Values are percentages from the left/top edge (0–100); null = centre.
-- Hero slides need no change — they live in store_settings.hero_slides jsonb.

alter table public.product_images
  add column if not exists focal_x int check (focal_x between 0 and 100),
  add column if not exists focal_y int check (focal_y between 0 and 100);

alter table public.collections
  add column if not exists image_focal_x int check (image_focal_x between 0 and 100),
  add column if not exists image_focal_y int check (image_focal_y between 0 and 100);
