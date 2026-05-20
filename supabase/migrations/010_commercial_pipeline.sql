-- =============================================
-- Fly.AI — Commercial Deals (CRM)
-- Migration: 010_commercial_pipeline.sql
-- =============================================
-- Cria public.deals para o módulo CRM do pipeline comercial.
-- A tabela legacy `pipeline` permanece intacta (usada no Overview).

CREATE TABLE IF NOT EXISTS public.deals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  value         NUMERIC      NOT NULL DEFAULT 0   CHECK (value >= 0),
  probability   INTEGER      NOT NULL DEFAULT 10  CHECK (probability BETWEEN 0 AND 100),
  stage         VARCHAR(20)  NOT NULL DEFAULT 'lead'
                             CHECK (stage IN ('lead','call','proposal','won','lost')),
  contact_name  VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_stage   ON public.deals (stage);
CREATE INDEX IF NOT EXISTS idx_deals_created ON public.deals (created_at DESC);

-- Reutiliza a função set_updated_at() já presente no schema.
CREATE TRIGGER deals_set_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_auth_only" ON public.deals
  FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
