-- =============================================
-- Fly.AI — Design IA pipeline base
-- Migration: 006_design_pipeline.sql
-- =============================================
-- Adds the data contracts the Design Studio needs:
--   - image_url:                 final asset stored in Supabase Storage
--   - image_prompt:              technical prompt (hidden behind Info Técnica)
--   - art_director_approved:     IA Diretor de Arte approval gate
--   - ceo_approved:              CEO Agent approval gate
--   - aspect_ratio:              '1:1' | '9:16' | '4:5' for correct framing
-- =============================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS art_director_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ceo_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(10)
    CHECK (aspect_ratio IS NULL OR aspect_ratio IN ('1:1','9:16','4:5'));

CREATE INDEX IF NOT EXISTS idx_posts_design_pending
  ON public.posts(status, art_director_approved, ceo_approved)
  WHERE status = 'pending';
