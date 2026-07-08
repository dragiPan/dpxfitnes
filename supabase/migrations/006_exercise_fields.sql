-- ============================================================
-- DPXFITNES — cardio-specific exercise targets, RPE, muscle groups
-- Run in the Supabase SQL editor AFTER 005_cardio.sql.
-- ============================================================

-- Cardio exercises are prescribed as zone + minutes instead of sets/reps;
-- strength exercises gain an RPE intensity target (5-10 scale).
alter table public.program_exercises
  add column if not exists target_minutes numeric,
  add column if not exists target_zone int check (target_zone in (1, 2, 3)),
  add column if not exists target_rpe numeric check (target_rpe between 1 and 10);

alter table public.exercise_library
  add column if not exists target_minutes numeric,
  add column if not exists target_zone int check (target_zone in (1, 2, 3)),
  add column if not exists target_rpe numeric check (target_rpe between 1 and 10),
  -- coach-side categorization for filtering the library
  add column if not exists muscle_group text;
