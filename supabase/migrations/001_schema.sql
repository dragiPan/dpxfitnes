-- ============================================================
-- DPX Fitnes — full database schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('coach', 'client')),
  language text not null default 'en' check (language in ('en', 'sr')),
  -- per-client toggle for optional body measurements in check-ins
  measurements_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- auto-create a profile row when a user signs up / accepts an invite
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper used by RLS policies
create or replace function public.is_coach()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'coach');
$$;

-- lets clients discover who the coach is (e.g. to notify them of a new comment)
create or replace function public.coach_ids()
returns setof uuid
language sql stable
security definer set search_path = public
as $$
  select id from profiles where role = 'coach';
$$;

-- ---------- Groups ----------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ---------- Daily check-ins (numbers transferred from MyFitnessPal) ----------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  calories numeric,
  protein numeric,
  carbs numeric,
  fiber numeric,
  sugar numeric,
  fat numeric,
  saturated_fat numeric,
  polyunsaturated_fat numeric,
  monounsaturated_fat numeric,
  trans_fat numeric,
  cholesterol numeric,
  sodium numeric,
  potassium numeric,
  vitamin_a numeric,
  vitamin_c numeric,
  calcium numeric,
  iron numeric,
  weight numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- coach-defined targets per nutrient; only rows with show_to_client = true
-- are visible to the client (e.g. the grayed-out calorie ceiling)
create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nutrient text not null,
  target_value numeric not null,
  show_to_client boolean not null default false,
  unique (user_id, nutrient)
);

-- optional body measurements (cm), enabled per client
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  neck numeric,
  shoulders numeric,
  chest numeric,
  waist numeric,
  hips numeric,
  arm numeric,
  thigh numeric,
  calf numeric,
  unique (user_id, date)
);

-- ---------- Programs (training plan builder) ----------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  day_index int not null default 0,
  title text not null default ''
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  order_index int not null default 0,
  name text not null default '',
  instructions text,
  youtube_url text,
  target_sets int,
  target_reps text,          -- text so the coach can write "8-12" or "AMRAP"
  target_weight text,        -- text so the coach can write "60kg" or "RPE 8"
  rest_seconds int
);

create table public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique (program_id, client_id)
);

-- actual performance logged by the client (or edited by the coach)
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  program_exercise_id uuid not null references public.program_exercises (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  set_number int not null,
  reps int,
  weight numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (program_exercise_id, client_id, date, set_number)
);

-- ---------- Meal plans ----------
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.meal_plan_meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  order_index int not null default 0,
  name text not null default '',
  time_hint text,            -- e.g. "08:00" or "after training"
  description text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric
);

-- ---------- Comments / Q&A ----------
-- attach a thread to any entity; client_id says whose context it belongs to
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (
    entity_type in ('program', 'program_exercise', 'meal_plan', 'meal', 'checkin')
  ),
  entity_id uuid not null,
  client_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- Message boards ----------
-- group_id null = announcement for everyone
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Training sessions (pushed to Google Calendar) ----------
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  google_event_id text,
  created_at timestamptz not null default now()
);

-- ---------- Google OAuth refresh tokens ----------
-- written by the owner after connecting; read ONLY by edge functions
-- via the service-role key (no select policy for clients on purpose)
create table public.google_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index idx_checkins_user_date on public.checkins (user_id, date desc);
create index idx_measurements_user_date on public.measurements (user_id, date desc);
create index idx_exercise_logs_client on public.exercise_logs (client_id, date desc);
create index idx_exercise_logs_exercise on public.exercise_logs (program_exercise_id);
create index idx_comments_entity on public.comments (entity_type, entity_id);
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_board_posts_group on public.board_posts (group_id, created_at desc);
create index idx_sessions_client on public.training_sessions (client_id, start_at);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.checkins enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.measurements enable row level security;
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_exercises enable row level security;
alter table public.program_assignments enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_meals enable row level security;
alter table public.comments enable row level security;
alter table public.board_posts enable row level security;
alter table public.notifications enable row level security;
alter table public.training_sessions enable row level security;
alter table public.google_tokens enable row level security;

-- profiles: everyone sees self; coach sees all; users update self; coach updates all
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or is_coach());
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid() or is_coach());

-- groups: coach manages; members can view their groups
create policy "groups_coach_all" on public.groups for all
  using (is_coach()) with check (is_coach());
create policy "groups_member_select" on public.groups for select
  using (exists (
    select 1 from group_members gm where gm.group_id = id and gm.user_id = auth.uid()
  ));

create policy "group_members_coach_all" on public.group_members for all
  using (is_coach()) with check (is_coach());
create policy "group_members_own_select" on public.group_members for select
  using (user_id = auth.uid());

-- check-ins: own rows or coach
create policy "checkins_own" on public.checkins for all
  using (user_id = auth.uid() or is_coach())
  with check (user_id = auth.uid() or is_coach());

-- targets: coach full control; clients only see rows flagged show_to_client
create policy "targets_coach_all" on public.nutrition_targets for all
  using (is_coach()) with check (is_coach());
create policy "targets_client_select" on public.nutrition_targets for select
  using (user_id = auth.uid() and show_to_client);

-- measurements: own rows or coach
create policy "measurements_own" on public.measurements for all
  using (user_id = auth.uid() or is_coach())
  with check (user_id = auth.uid() or is_coach());

-- programs: coach full control; clients can view programs assigned to them
create policy "programs_coach_all" on public.programs for all
  using (is_coach()) with check (is_coach());
create policy "programs_client_select" on public.programs for select
  using (exists (
    select 1 from program_assignments a
    where a.program_id = id and a.client_id = auth.uid()
  ));

create policy "program_days_coach_all" on public.program_days for all
  using (is_coach()) with check (is_coach());
create policy "program_days_client_select" on public.program_days for select
  using (exists (
    select 1 from program_assignments a
    where a.program_id = program_days.program_id and a.client_id = auth.uid()
  ));

create policy "program_exercises_coach_all" on public.program_exercises for all
  using (is_coach()) with check (is_coach());
create policy "program_exercises_client_select" on public.program_exercises for select
  using (exists (
    select 1
    from program_days d
    join program_assignments a on a.program_id = d.program_id
    where d.id = program_exercises.program_day_id and a.client_id = auth.uid()
  ));

create policy "assignments_coach_all" on public.program_assignments for all
  using (is_coach()) with check (is_coach());
create policy "assignments_client_select" on public.program_assignments for select
  using (client_id = auth.uid());

-- exercise logs: client edits own; coach edits all
create policy "exercise_logs_own" on public.exercise_logs for all
  using (client_id = auth.uid() or is_coach())
  with check (client_id = auth.uid() or is_coach());

-- meal plans: coach full control; client reads own
create policy "meal_plans_coach_all" on public.meal_plans for all
  using (is_coach()) with check (is_coach());
create policy "meal_plans_client_select" on public.meal_plans for select
  using (client_id = auth.uid());

create policy "meals_coach_all" on public.meal_plan_meals for all
  using (is_coach()) with check (is_coach());
create policy "meals_client_select" on public.meal_plan_meals for select
  using (exists (
    select 1 from meal_plans p
    where p.id = meal_plan_meals.meal_plan_id and p.client_id = auth.uid()
  ));

-- comments: visible to coach and to the client whose context they belong to
create policy "comments_select" on public.comments for select
  using (client_id = auth.uid() or is_coach());
create policy "comments_insert" on public.comments for insert
  with check (author_id = auth.uid() and (client_id = auth.uid() or is_coach()));
create policy "comments_delete" on public.comments for delete
  using (author_id = auth.uid() or is_coach());

-- board posts: coach writes; everyone sees global posts; members see group posts
create policy "board_posts_coach_all" on public.board_posts for all
  using (is_coach()) with check (is_coach());
create policy "board_posts_client_select" on public.board_posts for select
  using (
    group_id is null
    or exists (
      select 1 from group_members gm
      where gm.group_id = board_posts.group_id and gm.user_id = auth.uid()
    )
  );

-- notifications: users read/update their own; coach creates them
create policy "notifications_own_select" on public.notifications for select
  using (user_id = auth.uid() or is_coach());
create policy "notifications_own_update" on public.notifications for update
  using (user_id = auth.uid());
-- coach can notify anyone; clients may only create notifications addressed to a coach
create policy "notifications_insert" on public.notifications for insert
  with check (
    is_coach()
    or exists (select 1 from profiles p where p.id = user_id and p.role = 'coach')
  );

-- training sessions: coach manages; client views own
create policy "sessions_coach_all" on public.training_sessions for all
  using (is_coach()) with check (is_coach());
create policy "sessions_client_select" on public.training_sessions for select
  using (client_id = auth.uid());

-- google tokens: owner can write/replace their token; nobody can read via the
-- anon/client API (edge functions use the service-role key which bypasses RLS)
create policy "google_tokens_own_select" on public.google_tokens for select
  using (user_id = auth.uid() or is_coach());
create policy "google_tokens_own_insert" on public.google_tokens for insert
  with check (user_id = auth.uid());
create policy "google_tokens_own_update" on public.google_tokens for update
  using (user_id = auth.uid());
create policy "google_tokens_own_delete" on public.google_tokens for delete
  using (user_id = auth.uid());
