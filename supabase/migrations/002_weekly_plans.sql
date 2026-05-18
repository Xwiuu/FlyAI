-- =============================================
-- Fly.AI — Weekly strategic plans
-- Migration: 002_weekly_plans.sql
-- =============================================
-- Stores the structured output of the research-weekly agent:
--   { week_of, theme, market_gaps[], angles[], weekly_plan{pillar, satellites[]}, narrative_risks[] }
--
-- The full JSON sits in `plan` (JSONB). week_of and theme are denormalized
-- for cheap filtering/listing without unpacking the blob.
-- =============================================

CREATE TABLE public.weekly_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of     DATE NOT NULL UNIQUE,
  theme       TEXT NOT NULL,
  plan        JSONB NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','archived')),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX weekly_plans_status_idx  ON public.weekly_plans (status);
CREATE INDEX weekly_plans_week_of_idx ON public.weekly_plans (week_of DESC);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_plans_select" ON public.weekly_plans FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "weekly_plans_insert" ON public.weekly_plans FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "weekly_plans_update" ON public.weekly_plans FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "weekly_plans_delete" ON public.weekly_plans FOR DELETE TO authenticated USING (public.is_authorized());
