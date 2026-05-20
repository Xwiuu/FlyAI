-- =============================================
-- Fly.AI — Clients commercial fields
-- Migration: 007_clients_commercial_fields.sql
-- =============================================
-- Adds commercial metadata required by the AddClientDialog admin UI:
-- engagement style, recurrence flag, payment method, NF config and
-- contract URL. Kept as short VARCHARs (no new Postgres enums) to
-- follow the convention established by previous migrations.
-- =============================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS work_style VARCHAR(20)
    CHECK (work_style IN ('retainer','project','one_off')),
  ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20)
    CHECK (payment_method IN ('pix','boleto','credit_card')),
  ADD COLUMN IF NOT EXISTS nf_config VARCHAR(20)
    CHECK (nf_config IN ('automatic','manual')),
  ADD COLUMN IF NOT EXISTS contract_url TEXT;
