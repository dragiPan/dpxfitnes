-- ============================================================
-- DPXFITNES - keepalive function
-- Run in the Supabase SQL editor AFTER 007_retention.sql.
-- ============================================================

-- Called daily by the Vercel cron (/api/keepalive). Touches the database
-- so the free-tier project never counts as idle, without exposing any data.
create or replace function public.keepalive()
returns timestamptz
language sql stable
as $$
  select now();
$$;

revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
