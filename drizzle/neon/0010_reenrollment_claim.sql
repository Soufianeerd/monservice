CREATE FUNCTION public.link_current_reenrollment() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE provider_id text:=nullif(current_setting('monservice.provider_user_id',true),''); identity record; BEGIN
  IF provider_id IS NULL THEN RETURN NULL; END IF;
  SELECT id,email,"emailVerified" AS verified INTO identity FROM neon_auth."user" WHERE id::text=provider_id AND coalesce(banned,false)=false;
  IF NOT FOUND OR NOT identity.verified THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM public.identity_reenrollments WHERE lower(verified_source_email)=lower(identity.email) AND claimed_at IS NULL) THEN
    RETURN public.provision_app_user_internal(provider_id);
  END IF;
  RETURN public.current_app_user_id();
END $$;
REVOKE ALL ON FUNCTION public.link_current_reenrollment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_current_reenrollment() TO monservice_runtime;
