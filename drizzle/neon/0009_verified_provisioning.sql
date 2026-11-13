-- Trusted signup responses and verified request sessions use the same context.
-- A caller cannot provision a different provider identity with a raw function ID.
ALTER FUNCTION public.provision_app_user(text,text,text,text,text) RENAME TO provision_app_user_internal;
REVOKE ALL ON FUNCTION public.provision_app_user_internal(text,text,text,text,text) FROM monservice_runtime;
CREATE FUNCTION public.provision_app_user(p_provider_id text,p_profile_type text DEFAULT 'client',p_org_name text DEFAULT NULL,p_sector text DEFAULT NULL,p_profession text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE verified_provider text:=nullif(current_setting('monservice.provider_user_id',true),''); BEGIN
  IF verified_provider IS NULL OR (p_provider_id IS NOT NULL AND p_provider_id IS DISTINCT FROM verified_provider) THEN RAISE EXCEPTION 'Verified provider context required' USING ERRCODE='42501'; END IF;
  RETURN public.provision_app_user_internal(verified_provider,p_profile_type,p_org_name,p_sector,p_profession);
END $$;
REVOKE ALL ON FUNCTION public.provision_app_user(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_app_user(text,text,text,text,text) TO monservice_runtime;

-- Only the same verified, migrated professional can replace a missing workspace.
-- No supplied tenant ID, membership or entitlement is accepted. Preserve the old
-- reference in the import evidence; never recreate shared ghost organizations.
CREATE FUNCTION public.recover_current_workspace(p_name text,p_sector text,p_profession text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE actor public.users; new_org text; BEGIN
  SELECT * INTO actor FROM public.users WHERE id=public.current_app_user_id() FOR UPDATE;
  IF actor.id IS NULL OR actor.profile_type<>'professional' OR actor.account_closed_at IS NOT NULL OR
     NOT EXISTS(SELECT 1 FROM public.identity_reenrollments WHERE app_user_id=actor.id AND claimed_at IS NOT NULL) THEN RAISE EXCEPTION 'Workspace recovery denied' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=actor.organization_id) THEN RETURN actor.organization_id; END IF;
  IF nullif(btrim(p_name),'') IS NULL OR length(p_name)>200 OR p_sector NOT IN ('health','field_services','freelance','other') THEN RAISE EXCEPTION 'Invalid workspace'; END IF;
  new_org:=gen_random_uuid()::text;
  INSERT INTO public.organizations(id,name,industry,sector,profession,profile_type,is_public,country,created_at,updated_at)
  VALUES(new_org,p_name,p_sector,p_sector,p_profession,'professional',false,'France',now()::text,now()::text);
  UPDATE public.users SET organization_id=new_org,updated_at=now()::text WHERE id=actor.id;
  RETURN new_org;
END $$;
REVOKE ALL ON FUNCTION public.recover_current_workspace(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_current_workspace(text,text,text) TO monservice_runtime;

-- Membership is not a CRM read capability for a client account.
CREATE POLICY clients_read_authority ON public.clients AS RESTRICTIVE FOR SELECT TO monservice_runtime USING(public.current_profile_type()='professional' OR user_id=public.current_app_user_id());
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['contacts','deals','products','tasks','message_templates','billing_document_sequences'] LOOP
    EXECUTE format('CREATE POLICY professional_read_required ON public.%I AS RESTRICTIVE FOR SELECT TO monservice_runtime USING(public.current_profile_type()=''professional'')',t);
  END LOOP;
END $$;
