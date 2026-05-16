-- =============================================
-- Fly.AI — Seed
-- =============================================
-- Run AFTER creating the two founder users via the Supabase Auth dashboard
-- (Authentication → Users → Add user). Copy each user's UUID and replace the
-- placeholders below. Must be executed with the service_role key (e.g. via the
-- SQL editor as project owner) because authorized_users writes are not exposed
-- to authenticated clients.
-- =============================================

-- Founder #1 — CTO
INSERT INTO public.authorized_users (user_id, role)
VALUES ('a6b08ee6-b6c5-4057-b3e6-eef27cd94ee7', 'cto')   -- TODO: replace UUID
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Founder #2 — Commercial
INSERT INTO public.authorized_users (user_id, role)
VALUES ('e7136cca-a3dd-4369-94e0-9d6d4199e075', 'commercial')  -- TODO: replace UUID
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- =============================================
-- Reminder: enable MFA in Supabase Auth settings
-- =============================================
-- Dashboard → Authentication → Providers → Email: ensure signups are DISABLED
-- (only the two founders should exist). Authentication → MFA: enable TOTP.
-- Authentication → Policies: optionally set
--   ALTER ROLE authenticator SET pgrst.jwt_aud TO 'authenticated';
-- =============================================
