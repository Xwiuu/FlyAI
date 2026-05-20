-- =============================================
-- Fly.AI — Clients project & contact fields
-- Migration: 008_clients_project_fields.sql
-- =============================================
-- Adds phone, project_title and briefing to support the revised
-- AddClientDialog that replaces the generic work_style with real
-- project context captured at onboarding time.
-- =============================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS project_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS briefing      TEXT;
