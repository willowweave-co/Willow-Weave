-- ═══════════════════════════════════════════════════════════════════════════
-- Two-factor authentication for the dashboard login (2026-08). Run after 0012.
--
-- The sign-in flow is now two steps:
--   1. POST /api/admin/auth/challenge — email + password are verified ON THE
--      SERVER. The Supabase session that results is NOT handed to the browser;
--      it is encrypted (AES-256-GCM, app-side) and parked in the row below
--      while a 6-digit code goes out by email.
--   2. POST /api/admin/auth/verify — the code is checked, the session is
--      decrypted and only then written to the browser's auth cookies.
--
-- So this table briefly holds a credential. Two consequences drive its design:
--   * `session_cipher` is ciphertext, never a readable token. The key lives in
--     the app environment (ADMIN_2FA_SECRET / service-role key), never in the
--     database — so a leaked database dump alone yields nothing usable.
--   * RLS is on with NO policies at all. anon and authenticated therefore see
--     zero rows, forever; only the service-role client (which bypasses RLS)
--     can read or write it. That is deliberate — the routes that touch this
--     table run BEFORE the user has a session, so there is no signed-in
--     identity to write a policy against.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.admin_login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  -- HMAC-SHA256 of the 6-digit code. The code itself is never stored, so a
  -- dump of this table cannot be replayed into a login.
  code_hash text not null,
  -- AES-256-GCM ciphertext of {access_token, refresh_token}, single use.
  session_cipher text not null,
  -- Wrong-code guesses. 5 and the challenge is dead — 6 digits would otherwise
  -- fall to ~1M requests, which is minutes of scripted traffic.
  attempts int not null default 0,
  -- "Send it again" presses, capped so the challenge can't be turned into a
  -- free mail cannon aimed at a staff inbox.
  resends int not null default 0,
  -- Drives the resend cooldown server-side; a disabled button is not a control.
  last_sent_at timestamptz not null default now(),
  ip text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_challenges_expires_idx
  on public.admin_login_challenges (expires_at);
create index if not exists admin_login_challenges_user_idx
  on public.admin_login_challenges (user_id, created_at desc);

alter table public.admin_login_challenges enable row level security;

-- No policies are created on purpose (see header). Belt to those braces: strip
-- the default table grants so even a future policy can't accidentally open it
-- to the public anon key.
revoke all on public.admin_login_challenges from anon, authenticated;

-- ── Housekeeping ────────────────────────────────────────────────────────────
-- Spent and expired challenges are dead weight holding ciphertext. The daily
-- keepalive cron calls this; it is safe to run at any time.
create or replace function public.purge_expired_login_challenges()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from admin_login_challenges where expires_at < now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default; revoking it takes it away from
-- service_role too, so grant that back explicitly — the keepalive cron calls
-- this as service_role.
revoke all on function public.purge_expired_login_challenges() from public, anon, authenticated;
grant execute on function public.purge_expired_login_challenges() to service_role;
