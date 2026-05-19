-- =============================================
-- Fly.AI — V5: Agent collaboration & performance memory
-- Migration: 003_agent_collaboration.sql
-- =============================================
-- Adds:
--   1) agent_meetings + meeting_messages — persisted chat between user
--      and the agent fleet (eliminates terminal-only invocation).
--   2) content_performance_logs — historical engagement data so the
--      research-weekly agent can ground its theses in what actually worked.
--   3) posts.metadata (JSONB) — opaque payload for the Content Agent V5 schema
--      (3 hooks variants, audio_visual_cues, visual_direction, etc.).
-- Security: same is_authorized() (whitelist + AAL2) pattern as 002.
-- =============================================

-- =============================================
-- posts.metadata — Content Agent V5 payload
-- =============================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- =============================================
-- agent_meetings — orchestration sessions
-- =============================================
CREATE TABLE public.agent_meetings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  type         TEXT NOT NULL
               CHECK (type IN ('weekly_planning','crisis','content_review','ad_hoc')),
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','awaiting_user','completed','archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX agent_meetings_status_idx ON public.agent_meetings (status, created_at DESC);
ALTER TABLE public.agent_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_meetings_select" ON public.agent_meetings FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "agent_meetings_insert" ON public.agent_meetings FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "agent_meetings_update" ON public.agent_meetings FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "agent_meetings_delete" ON public.agent_meetings FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- meeting_messages — ordered turns inside a meeting
-- =============================================
CREATE TABLE public.meeting_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.agent_meetings(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL
             CHECK (sender IN ('user','research_agent','content_agent','ceo_agent','analytics_agent','devils_advocate')),
  role       TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content    TEXT NOT NULL,
  sequence   INT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meeting_id, sequence)
);
CREATE INDEX meeting_messages_meeting_idx ON public.meeting_messages (meeting_id, sequence);
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_messages_select" ON public.meeting_messages FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "meeting_messages_insert" ON public.meeting_messages FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "meeting_messages_update" ON public.meeting_messages FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "meeting_messages_delete" ON public.meeting_messages FOR DELETE TO authenticated USING (public.is_authorized());

-- =============================================
-- content_performance_logs — historical engagement memory
-- =============================================
CREATE TABLE public.content_performance_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  likes           INT NOT NULL DEFAULT 0 CHECK (likes >= 0),
  shares          INT NOT NULL DEFAULT 0 CHECK (shares >= 0),
  saves           INT NOT NULL DEFAULT 0 CHECK (saves >= 0),
  dm_clicks       INT NOT NULL DEFAULT 0 CHECK (dm_clicks >= 0),
  reach           INT NOT NULL DEFAULT 0 CHECK (reach >= 0),
  engagement_rate NUMERIC(6,4) CHECK (engagement_rate IS NULL OR engagement_rate >= 0),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX content_performance_post_idx       ON public.content_performance_logs (post_id, logged_at DESC);
CREATE INDEX content_performance_engagement_idx ON public.content_performance_logs (engagement_rate DESC NULLS LAST);
ALTER TABLE public.content_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_performance_logs_select" ON public.content_performance_logs FOR SELECT TO authenticated USING (public.is_authorized());
CREATE POLICY "content_performance_logs_insert" ON public.content_performance_logs FOR INSERT TO authenticated WITH CHECK (public.is_authorized());
CREATE POLICY "content_performance_logs_update" ON public.content_performance_logs FOR UPDATE TO authenticated USING (public.is_authorized()) WITH CHECK (public.is_authorized());
CREATE POLICY "content_performance_logs_delete" ON public.content_performance_logs FOR DELETE TO authenticated USING (public.is_authorized());
