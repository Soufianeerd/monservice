-- The application owns stable IDs. Provider IDs never replace business foreign keys.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='monservice_runtime') THEN
    CREATE ROLE monservice_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
CREATE TABLE public.user_identities (
  app_user_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('neon','supabase')),
  provider_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz NOT NULL,
  linkage_method text NOT NULL CHECK (linkage_method IN ('provider_signup','verified_reenrollment','source_import','synthetic_fixture')),
  PRIMARY KEY (provider,provider_user_id),
  UNIQUE (app_user_id,provider)
);
ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

-- Runtime sets only a verified provider ID, transaction-locally. Resolve tenant and
-- profile from stored business data instead of trusting independently supplied GUCs.
CREATE FUNCTION public.current_app_user_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$ SELECT i.app_user_id FROM public.user_identities i JOIN public.users u ON u.id=i.app_user_id
WHERE i.provider='neon' AND i.provider_user_id=nullif(current_setting('monservice.provider_user_id',true),'')
AND u.account_closed_at IS NULL $$;
CREATE FUNCTION public.current_profile_type() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$ SELECT profile_type FROM public.users WHERE id=public.current_app_user_id() $$;
REVOKE ALL ON FUNCTION public.current_app_user_id(),public.current_profile_type() FROM PUBLIC;
