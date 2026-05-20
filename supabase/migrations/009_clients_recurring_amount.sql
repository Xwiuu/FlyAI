-- =============================================
-- Fly.AI — Clients recurring amount
-- Migration: 009_clients_recurring_amount.sql
-- =============================================
-- Stores the explicit monthly recurring value when a contract is set
-- as recurrent. Kept separate from ticket so one-off fees and MRR
-- contributions can be tracked independently.
-- =============================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS recurring_amount NUMERIC;
