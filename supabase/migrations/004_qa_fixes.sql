-- =============================================
-- Fly.AI — QA Fixes
-- Migration: 004_qa_fixes.sql
-- =============================================
-- Fixes:
--   1) Unique constraint on (meeting_id, sequence) to prevent race
--      conditions when two concurrent appendMessage calls compute the
--      same sequence number.
--   2) authorized_users RLS hardening — WITH CHECK (false) blocks
--      self-insertion, ensuring only pre-seeded founders can access
--      the dashboard.
-- =============================================

-- 1. Unique sequence per meeting (prevents transcript corruption on race).
ALTER TABLE public.meeting_messages
  DROP CONSTRAINT IF EXISTS uq_meeting_messages_sequence;

ALTER TABLE public.meeting_messages
  ADD CONSTRAINT uq_meeting_messages_sequence UNIQUE (meeting_id, sequence);

-- 2. Harden authorized_users RLS so no authenticated user can add themselves.
--    The table must exist; if it was created outside migrations, this is a no-op
--    that can be applied manually.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'authorized_users'
  ) THEN
    -- Drop any permissive INSERT policy that could allow self-insertion.
    DROP POLICY IF EXISTS "authorized_users_insert" ON public.authorized_users;

    -- Ensure SELECT is still allowed for authenticated users (needed by middleware).
    DROP POLICY IF EXISTS "authorized_users_select" ON public.authorized_users;
    CREATE POLICY "authorized_users_select" ON public.authorized_users
      FOR SELECT USING (auth.uid() IS NOT NULL);

    -- Block all writes from the application layer; founders are seeded via
    -- service role key only (Supabase dashboard or seed.sql).
    DROP POLICY IF EXISTS "authorized_users_no_write" ON public.authorized_users;
    CREATE POLICY "authorized_users_no_write" ON public.authorized_users
      FOR INSERT WITH CHECK (false);
    CREATE POLICY "authorized_users_no_update" ON public.authorized_users
      FOR UPDATE USING (false);
    CREATE POLICY "authorized_users_no_delete" ON public.authorized_users
      FOR DELETE USING (false);
  END IF;
END $$;
