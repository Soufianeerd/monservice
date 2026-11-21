-- The SDK authenticates its signed session cookie. Check the exact managed
-- session in the same branch so cached cookies cannot revive logout or a ban.
CREATE FUNCTION public.provider_session_is_active(p_provider_id text,p_session_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT EXISTS(SELECT 1 FROM neon_auth.session s JOIN neon_auth."user" u ON u.id=s."userId"
  WHERE s.id::text=p_session_id AND s."userId"::text=p_provider_id AND s."expiresAt">now() AND coalesce(u.banned,false)=false) $$;
REVOKE ALL ON FUNCTION public.provider_session_is_active(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_session_is_active(text,text) TO monservice_runtime;
