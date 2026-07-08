-- Homepage hero slideshow, managed from Admin → Homepage.
-- Stored as jsonb on the settings singleton: an array of
--   { id, mediaType: "image"|"video", mediaUrl, eyebrow, heading, href, ctaLabel, enabled }
-- null = "never edited" → the app serves its built-in seed slides.
alter table public.store_settings
  add column if not exists hero_slides jsonb;
