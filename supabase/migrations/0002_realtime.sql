-- ═══════════════════════════════════════════════════════════════════════════
-- Optional but recommended: instant "new order" notifications in the dashboard.
-- Adds the orders table to Supabase's realtime publication so the dashboard's
-- websocket subscription receives INSERT events the moment a customer checks
-- out. (Without this, the dashboard still updates via its 30-second poll.)
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.orders;
