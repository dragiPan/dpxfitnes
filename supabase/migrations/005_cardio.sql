-- ============================================================
-- DPXFITNES — cardio session tracking
-- Run in the Supabase SQL editor AFTER 004_perf_security.sql.
-- ============================================================

-- Clients log individual cardio sessions: what kind, which HR zone, and
-- minutes and/or steps. Daily total steps stay on checkins.steps (charts);
-- these rows add the per-session detail and feed the weekly-minutes totals.
create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  kind text not null default 'walk' check (
    kind in ('walk', 'jog', 'run', 'incline_treadmill', 'bike', 'elliptical', 'rowing', 'swim', 'other')
  ),
  zone int check (zone in (1, 2, 3)),
  minutes numeric,
  steps numeric,
  created_at timestamptz not null default now()
);

create index idx_cardio_logs_user_date on public.cardio_logs (user_id, date desc);

alter table public.cardio_logs enable row level security;
create policy "cardio_logs_own" on public.cardio_logs for all
  using (user_id = (select auth.uid()) or (select public.is_coach()))
  with check (user_id = (select auth.uid()) or (select public.is_coach()));

-- Cardio targets reuse the nutrition_targets table with two special keys:
--   'steps'             -> daily step target
--   'cardio_weekly_min' -> weekly cardio minutes target (e.g. 150 min zone 2)
-- No schema change needed; the coach Targets tab now exposes both rows.
