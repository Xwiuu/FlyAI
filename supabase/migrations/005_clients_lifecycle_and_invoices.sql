-- =============================================
-- Fly.AI — Clients lifecycle Kanban + NFs
-- Migration: 005_clients_lifecycle_and_invoices.sql
-- =============================================
-- Adds lifecycle_stage and tokens_used_mtd to clients to power the
-- Kanban board (Onboarding / Ativos / Risco de Churn / Encerrados).
-- Adds invoice_status and invoice_number to transactions so the
-- client detail sheet can render a real billing history (NFs).
-- =============================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (lifecycle_stage IN ('onboarding','active','at_risk','churned')),
  ADD COLUMN IF NOT EXISTS tokens_used_mtd INTEGER NOT NULL DEFAULT 0;

-- Backfill from legacy status + started_at so existing rows land in the
-- right Kanban column on first load.
UPDATE public.clients SET lifecycle_stage =
  CASE
    WHEN status = 'churned' THEN 'churned'
    WHEN status = 'paused'  THEN 'at_risk'
    WHEN started_at > CURRENT_DATE - INTERVAL '30 days' THEN 'onboarding'
    ELSE 'active'
  END
WHERE lifecycle_stage = 'active';

CREATE INDEX IF NOT EXISTS idx_clients_lifecycle ON public.clients(lifecycle_stage);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20)
    CHECK (invoice_status IN ('paid','pending','overdue')),
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_transactions_client_invoice
  ON public.transactions(client_id, date DESC)
  WHERE invoice_status IS NOT NULL;
