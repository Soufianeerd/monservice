-- Seed file for local E2E testing
-- Abort if not running on local environment
DO $$
BEGIN
  IF current_database() NOT LIKE 'postgres%' THEN
    RAISE EXCEPTION 'This script can only be run on local environments!';
  END IF;
END $$;

-- 1. Create Mock Organizations
INSERT INTO public.organizations (id, name, slug, sector, profile_type, is_public, created_at, updated_at) VALUES
  ('org-a-1234', 'Organization A', 'org-a', 'IT', 'professional', true, now()::text, now()::text),
  ('org-b-5678', 'Organization B', 'org-b', 'Consulting', 'professional', true, now()::text, now()::text)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Auth Users and Public Users for Organization A
-- Professional A
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'pro-a-uuid-1111-2222-333344445555', 'authenticated', 'authenticated', 'pro_a@monservice.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Professional A","profileType":"professional"}', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('pro-a-uuid-1111-2222-333344445555', 'pro-a-uuid-1111-2222-333344445555', json_build_object('sub', 'pro-a-uuid-1111-2222-333344445555', 'email', 'pro_a@monservice.com'), 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- Force link public.users to the organization (the trigger created the profile already but we update it)
UPDATE public.users SET organization_id = 'org-a-1234' WHERE id = 'pro-a-uuid-1111-2222-333344445555';

-- Client A
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'cli-a-uuid-1111-2222-333344445555', 'authenticated', 'authenticated', 'client_a@monservice.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Client A","profileType":"client"}', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('cli-a-uuid-1111-2222-333344445555', 'cli-a-uuid-1111-2222-333344445555', json_build_object('sub', 'cli-a-uuid-1111-2222-333344445555', 'email', 'client_a@monservice.com'), 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- Force link public.users to the organization for Client A
UPDATE public.users SET organization_id = 'org-a-1234' WHERE id = 'cli-a-uuid-1111-2222-333344445555';


-- 3. Create Auth Users and Public Users for Organization B
-- Professional B
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'pro-b-uuid-1111-2222-333344445555', 'authenticated', 'authenticated', 'pro_b@monservice.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Professional B","profileType":"professional"}', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('pro-b-uuid-1111-2222-333344445555', 'pro-b-uuid-1111-2222-333344445555', json_build_object('sub', 'pro-b-uuid-1111-2222-333344445555', 'email', 'pro_b@monservice.com'), 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

UPDATE public.users SET organization_id = 'org-b-5678' WHERE id = 'pro-b-uuid-1111-2222-333344445555';

-- Client B
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'cli-b-uuid-1111-2222-333344445555', 'authenticated', 'authenticated', 'client_b@monservice.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Client B","profileType":"client"}', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('cli-b-uuid-1111-2222-333344445555', 'cli-b-uuid-1111-2222-333344445555', json_build_object('sub', 'cli-b-uuid-1111-2222-333344445555', 'email', 'client_b@monservice.com'), 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

UPDATE public.users SET organization_id = 'org-b-5678' WHERE id = 'cli-b-uuid-1111-2222-333344445555';
