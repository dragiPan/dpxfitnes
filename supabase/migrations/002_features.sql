-- ============================================================
-- DPXFITNES — feature pack 2 + security hardening
-- Run this in the Supabase SQL editor AFTER 001_schema.sql.
-- ============================================================

-- ---------- Security fixes ----------

-- 1) Coaches could read clients' Google refresh tokens via the client API.
--    Edge functions use the service-role key, so nobody but the owner needs
--    read access here.
drop policy if exists "google_tokens_own_select" on public.google_tokens;
create policy "google_tokens_own_select" on public.google_tokens for select
  using (user_id = auth.uid());

-- 2) The profiles update policy let a client update their own row INCLUDING
--    the role column (self-promotion to coach). Block role changes unless the
--    requester is a coach.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_coach() then
    raise exception 'only a coach can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------- Steps & cardio tracking ----------

-- daily total steps, transferred like the MFP numbers
alter table public.checkins add column if not exists steps numeric;

-- exercises can now be strength or cardio
alter table public.program_exercises
  add column if not exists kind text not null default 'strength'
  check (kind in ('strength', 'cardio'));

-- cardio logs store steps and duration instead of reps/weight
alter table public.exercise_logs add column if not exists steps numeric;
alter table public.exercise_logs add column if not exists duration_min numeric;

-- ---------- Intake questionnaire ----------
create table public.intake_responses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}',
  submitted_at timestamptz
);

alter table public.intake_responses enable row level security;
create policy "intake_own" on public.intake_responses for all
  using (user_id = auth.uid() or is_coach())
  with check (user_id = auth.uid() or is_coach());

-- ---------- Exercise library (coach only) ----------
create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'strength' check (kind in ('strength', 'cardio')),
  youtube_url text,
  instructions text,
  target_sets int,
  target_reps text,
  target_weight text,
  rest_seconds int,
  created_at timestamptz not null default now()
);

alter table public.exercise_library enable row level security;
create policy "library_coach_all" on public.exercise_library for all
  using (is_coach()) with check (is_coach());

-- ---------- Direct 1:1 chat ----------
-- client_id identifies the thread (one thread per client, with the coach)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_messages_thread on public.messages (client_id, created_at);

alter table public.messages enable row level security;
create policy "messages_select" on public.messages for select
  using (client_id = auth.uid() or is_coach());
create policy "messages_insert" on public.messages for insert
  with check (sender_id = auth.uid() and (client_id = auth.uid() or is_coach()));
create policy "messages_mark_read" on public.messages for update
  using (client_id = auth.uid() or is_coach());

-- live updates for the chat UI
alter publication supabase_realtime add table public.messages;

-- ---------- Payment tracking (manual, no processor) ----------
create table public.subscriptions (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  package_name text,
  price numeric,
  currency text not null default 'EUR',
  paid_until date,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "subscriptions_coach_all" on public.subscriptions for all
  using (is_coach()) with check (is_coach());
create policy "subscriptions_client_select" on public.subscriptions for select
  using (client_id = auth.uid());
