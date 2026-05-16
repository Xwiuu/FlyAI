-- =============================================
-- Fly.AI — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================
-- Security model:
--   - RLS enabled on every table.
--   - All access gated by public.is_authorized(), which requires:
--       (a) auth.uid() to be present in public.authorized_users
--       (b) the JWT to have AAL2 (current session passed 2FA challenge)
--   - Per-table SELECT/INSERT/UPDATE/DELETE policies (no blanket USING).
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- updated_at trigger helper
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================
-- authorized_users — whitelist of founders
-- =============================================
CREATE TABLE public.authorized_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       VARCHAR(50) NOT NULL CHECK (role IN ('cto', 'commercial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- Authorization helper: whitelist AND AAL2
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.authorized_users
      WHERE user_id = auth.uid()
    )
    AND COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

REVOKE ALL ON FUNCTION public.is_authorized() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_authorized() TO authenticated;

-- authorized_users itself: read-only for founders. Writes via service role only.
CREATE POLICY "authorized_users_select" ON public.authorized_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- posts — content drafts from the agent team
-- =============================================
CREATE TABLE public.posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent          VARCHAR(50) NOT NULL,
  type           VARCHAR(50) NOT NULL,
  content        TEXT NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','pending','approved','rejected','published')),
  scheduled_for  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at    TIMESTAMPTZ,
  approved_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at   TIMESTAMPTZ
);
CREATE INDEX posts_status_idx        ON public.posts (status);
CREATE INDEX posts_scheduled_for_idx ON public.posts (scheduled_for) WHERE scheduled_for IS NOT NULL;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON public.posts FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "posts_update" ON public.posts FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "posts_delete" ON public.posts FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- briefs — daily CEO Agent briefs
-- =============================================
CREATE TABLE public.briefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  content     TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','archived')),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefs_select" ON public.briefs FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "briefs_insert" ON public.briefs FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "briefs_update" ON public.briefs FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "briefs_delete" ON public.briefs FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- metrics — IG/LinkedIn metrics (manual input MVP)
-- =============================================
CREATE TABLE public.metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     VARCHAR(50) NOT NULL CHECK (platform IN ('instagram','linkedin')),
  metric_name  VARCHAR(100) NOT NULL,
  value        NUMERIC NOT NULL,
  post_id      UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX metrics_post_id_idx      ON public.metrics (post_id);
CREATE INDEX metrics_platform_idx     ON public.metrics (platform);
CREATE INDEX metrics_collected_at_idx ON public.metrics (collected_at DESC);
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_select" ON public.metrics FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "metrics_insert" ON public.metrics FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "metrics_update" ON public.metrics FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "metrics_delete" ON public.metrics FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- clients — active customers
-- =============================================
CREATE TABLE public.clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  ticket        NUMERIC NOT NULL CHECK (ticket >= 0),
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','paused','churned')),
  started_at    DATE NOT NULL,
  next_delivery DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- pipeline — sales pipeline
-- =============================================
CREATE TABLE public.pipeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  company           VARCHAR(255),
  email             VARCHAR(255),
  stage             VARCHAR(50) NOT NULL
                    CHECK (stage IN ('lead','call_scheduled','proposal','closed_won','closed_lost')),
  estimated_ticket  NUMERIC CHECK (estimated_ticket IS NULL OR estimated_ticket >= 0),
  win_probability   INTEGER CHECK (win_probability IS NULL OR (win_probability BETWEEN 0 AND 100)),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX pipeline_stage_idx ON public.pipeline (stage);
CREATE TRIGGER pipeline_set_updated_at BEFORE UPDATE ON public.pipeline
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_select" ON public.pipeline FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "pipeline_insert" ON public.pipeline FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "pipeline_update" ON public.pipeline FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "pipeline_delete" ON public.pipeline FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- transactions — financial entries (manual MVP)
-- =============================================
CREATE TABLE public.transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
  description VARCHAR(255) NOT NULL,
  amount      NUMERIC NOT NULL CHECK (amount >= 0),
  category    VARCHAR(100),
  date        DATE NOT NULL,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX transactions_date_idx      ON public.transactions (date DESC);
CREATE INDEX transactions_client_id_idx ON public.transactions (client_id);
CREATE INDEX transactions_type_idx      ON public.transactions (type);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- okrs — quarterly objectives
-- =============================================
CREATE TABLE public.okrs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter     VARCHAR(10) NOT NULL,
  objective   TEXT NOT NULL,
  key_results JSONB NOT NULL DEFAULT '[]'::JSONB,
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','completed','archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX okrs_quarter_idx ON public.okrs (quarter);
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "okrs_select" ON public.okrs FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "okrs_insert" ON public.okrs FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "okrs_update" ON public.okrs FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "okrs_delete" ON public.okrs FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- agent_logs — agent execution audit trail
-- =============================================
CREATE TABLE public.agent_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       VARCHAR(50) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('success','error','pending')),
  output      TEXT,
  error       TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX agent_logs_agent_idx      ON public.agent_logs (agent);
CREATE INDEX agent_logs_created_at_idx ON public.agent_logs (created_at DESC);
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_logs_select" ON public.agent_logs FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "agent_logs_insert" ON public.agent_logs FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "agent_logs_update" ON public.agent_logs FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "agent_logs_delete" ON public.agent_logs FOR DELETE TO authenticated USING (public.is_authorized());
