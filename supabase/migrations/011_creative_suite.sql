-- =============================================
-- Fly.AI — Creative Suite & AI Art Direction Engine
-- Migration: 011_creative_suite.sql
-- =============================================
-- Adds the persistence layer for the Creative Suite:
--   - brand_vault:      single source of truth for visual identity
--                       (logos, color tokens, typography, style notes)
--   - inspiration_bank: curated aesthetic references the agents pull from
-- =============================================

-- ─── Brand Vault ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_dark_url TEXT,
  logo_light_url TEXT,
  primary_color VARCHAR(9),         -- #RRGGBB or #RRGGBBAA
  secondary_color VARCHAR(9),
  dark_color VARCHAR(9),
  font_family VARCHAR(120),
  visual_style_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brand_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_vault_auth_only" ON public.brand_vault;
CREATE POLICY "brand_vault_auth_only" ON public.brand_vault
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Inspiration Bank ────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspiration_format') THEN
    CREATE TYPE inspiration_format AS ENUM (
      'single_post',
      'carousel',
      'reels',
      'lead_magnet'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.inspiration_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  format inspiration_format NOT NULL,
  media_url TEXT NOT NULL,
  category_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inspiration_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspiration_bank_auth_only" ON public.inspiration_bank;
CREATE POLICY "inspiration_bank_auth_only" ON public.inspiration_bank
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_inspiration_bank_format
  ON public.inspiration_bank(format);
