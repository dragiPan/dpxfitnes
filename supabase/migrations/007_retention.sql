-- ============================================================
-- DPXFITNES — retention support
-- Run in the Supabase SQL editor AFTER 006_exercise_fields.sql.
-- ============================================================

-- Users may delete their own notifications (the app auto-purges read ones
-- older than 60 days; board posts are purged by the coach's existing policy).
create policy "notifications_own_delete" on public.notifications for delete
  using (user_id = (select auth.uid()));
