-- ============================================================
-- DPXFITNES — fix pack 3
-- Run in the Supabase SQL editor AFTER 002_features.sql.
-- ============================================================

-- ---------- Fix: clients could never notify the coach ----------
-- The old notifications insert policy checked "is the recipient a coach?" by
-- selecting from profiles, but that subquery ran under the CLIENT's RLS, which
-- can't see the coach's row — so the check always failed. This broke the
-- coach's in-app notifications for check-ins, chat and comments, and made the
-- check-in save surface a false error. A security-definer helper bypasses RLS
-- for exactly this one question.
create or replace function public.is_coach_user(uid uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = uid and role = 'coach');
$$;

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert
  with check (is_coach() or is_coach_user(user_id));

-- ---------- Speed: cache Google access tokens ----------
-- Avoids a token-refresh round trip to Google on every calendar load; the
-- edge function now refreshes only when the cached token is about to expire.
alter table public.google_tokens add column if not exists access_token text;
alter table public.google_tokens add column if not exists access_expires_at timestamptz;
