-- Site-wide contact details & social links, edited in Admin → Settings and
-- shown wherever the store displays them (footer, contact page, packing
-- slips, order emails). Shape:
--   { phone, whatsapp, email, processingNote, facebook, instagram, tiktok }
-- null = the built-in defaults (the values that used to be hard-coded).
alter table public.store_settings
  add column if not exists contact jsonb;
