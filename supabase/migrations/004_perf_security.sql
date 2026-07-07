-- ============================================================
-- DPXFITNES — performance + linter cleanup
-- Run in the Supabase SQL editor AFTER 003_fixes.sql.
-- Addresses: auth_rls_initplan warnings, unindexed foreign keys,
-- and SECURITY DEFINER functions exposed to anon via the REST API.
-- ============================================================

-- ---------- Lock down helper functions ----------
-- Trigger functions should not be callable via /rest/v1/rpc at all;
-- the RLS helpers only need to be callable by signed-in users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_escalation() from public, anon, authenticated;
revoke execute on function public.is_coach() from public, anon;
revoke execute on function public.is_coach_user(uuid) from public, anon;
revoke execute on function public.coach_ids() from public, anon;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.is_coach_user(uuid) to authenticated;
grant execute on function public.coach_ids() to authenticated;

-- ---------- Missing foreign-key indexes ----------
create index if not exists idx_board_posts_author on public.board_posts (author_id);
create index if not exists idx_comments_author on public.comments (author_id);
create index if not exists idx_comments_client on public.comments (client_id);
create index if not exists idx_group_members_user on public.group_members (user_id);
create index if not exists idx_meal_plan_meals_plan on public.meal_plan_meals (meal_plan_id);
create index if not exists idx_meal_plans_client on public.meal_plans (client_id);
create index if not exists idx_messages_sender on public.messages (sender_id);
create index if not exists idx_assignments_client on public.program_assignments (client_id);
create index if not exists idx_program_days_program on public.program_days (program_id);
create index if not exists idx_program_exercises_day on public.program_exercises (program_day_id);

-- ---------- Rewrite RLS policies for the initplan optimization ----------
-- (select auth.uid()) / (select is_coach()) are evaluated once per query
-- instead of once per row.

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (id = (select auth.uid()) or (select public.is_coach()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (id = (select auth.uid()) or (select public.is_coach()));

-- groups
drop policy if exists "groups_member_select" on public.groups;
create policy "groups_member_select" on public.groups for select
  using (exists (
    select 1 from group_members gm
    where gm.group_id = id and gm.user_id = (select auth.uid())
  ));
drop policy if exists "group_members_own_select" on public.group_members;
create policy "group_members_own_select" on public.group_members for select
  using (user_id = (select auth.uid()));

-- checkins
drop policy if exists "checkins_own" on public.checkins;
create policy "checkins_own" on public.checkins for all
  using (user_id = (select auth.uid()) or (select public.is_coach()))
  with check (user_id = (select auth.uid()) or (select public.is_coach()));

-- nutrition targets
drop policy if exists "targets_client_select" on public.nutrition_targets;
create policy "targets_client_select" on public.nutrition_targets for select
  using (user_id = (select auth.uid()) and show_to_client);

-- measurements
drop policy if exists "measurements_own" on public.measurements;
create policy "measurements_own" on public.measurements for all
  using (user_id = (select auth.uid()) or (select public.is_coach()))
  with check (user_id = (select auth.uid()) or (select public.is_coach()));

-- programs
drop policy if exists "programs_client_select" on public.programs;
create policy "programs_client_select" on public.programs for select
  using (exists (
    select 1 from program_assignments a
    where a.program_id = id and a.client_id = (select auth.uid())
  ));
drop policy if exists "program_days_client_select" on public.program_days;
create policy "program_days_client_select" on public.program_days for select
  using (exists (
    select 1 from program_assignments a
    where a.program_id = program_days.program_id and a.client_id = (select auth.uid())
  ));
drop policy if exists "program_exercises_client_select" on public.program_exercises;
create policy "program_exercises_client_select" on public.program_exercises for select
  using (exists (
    select 1
    from program_days d
    join program_assignments a on a.program_id = d.program_id
    where d.id = program_exercises.program_day_id and a.client_id = (select auth.uid())
  ));
drop policy if exists "assignments_client_select" on public.program_assignments;
create policy "assignments_client_select" on public.program_assignments for select
  using (client_id = (select auth.uid()));

-- exercise logs
drop policy if exists "exercise_logs_own" on public.exercise_logs;
create policy "exercise_logs_own" on public.exercise_logs for all
  using (client_id = (select auth.uid()) or (select public.is_coach()))
  with check (client_id = (select auth.uid()) or (select public.is_coach()));

-- meal plans
drop policy if exists "meal_plans_client_select" on public.meal_plans;
create policy "meal_plans_client_select" on public.meal_plans for select
  using (client_id = (select auth.uid()));
drop policy if exists "meals_client_select" on public.meal_plan_meals;
create policy "meals_client_select" on public.meal_plan_meals for select
  using (exists (
    select 1 from meal_plans p
    where p.id = meal_plan_meals.meal_plan_id and p.client_id = (select auth.uid())
  ));

-- comments
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select
  using (client_id = (select auth.uid()) or (select public.is_coach()));
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert
  with check (
    author_id = (select auth.uid())
    and (client_id = (select auth.uid()) or (select public.is_coach()))
  );
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete
  using (author_id = (select auth.uid()) or (select public.is_coach()));

-- board posts
drop policy if exists "board_posts_client_select" on public.board_posts;
create policy "board_posts_client_select" on public.board_posts for select
  using (
    group_id is null
    or exists (
      select 1 from group_members gm
      where gm.group_id = board_posts.group_id and gm.user_id = (select auth.uid())
    )
  );

-- notifications
drop policy if exists "notifications_own_select" on public.notifications;
create policy "notifications_own_select" on public.notifications for select
  using (user_id = (select auth.uid()) or (select public.is_coach()));
drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications for update
  using (user_id = (select auth.uid()));

-- training sessions
drop policy if exists "sessions_client_select" on public.training_sessions;
create policy "sessions_client_select" on public.training_sessions for select
  using (client_id = (select auth.uid()));

-- google tokens
drop policy if exists "google_tokens_own_select" on public.google_tokens;
create policy "google_tokens_own_select" on public.google_tokens for select
  using (user_id = (select auth.uid()));
drop policy if exists "google_tokens_own_insert" on public.google_tokens;
create policy "google_tokens_own_insert" on public.google_tokens for insert
  with check (user_id = (select auth.uid()));
drop policy if exists "google_tokens_own_update" on public.google_tokens;
create policy "google_tokens_own_update" on public.google_tokens for update
  using (user_id = (select auth.uid()));
drop policy if exists "google_tokens_own_delete" on public.google_tokens;
create policy "google_tokens_own_delete" on public.google_tokens for delete
  using (user_id = (select auth.uid()));

-- intake
drop policy if exists "intake_own" on public.intake_responses;
create policy "intake_own" on public.intake_responses for all
  using (user_id = (select auth.uid()) or (select public.is_coach()))
  with check (user_id = (select auth.uid()) or (select public.is_coach()));

-- messages
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (client_id = (select auth.uid()) or (select public.is_coach()));
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and (client_id = (select auth.uid()) or (select public.is_coach()))
  );
drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read" on public.messages for update
  using (client_id = (select auth.uid()) or (select public.is_coach()));

-- subscriptions
drop policy if exists "subscriptions_client_select" on public.subscriptions;
create policy "subscriptions_client_select" on public.subscriptions for select
  using (client_id = (select auth.uid()));
