-- Server-owned re-enrollment allowlist. Never accepted from browser email/IDs.
CREATE TABLE public.identity_reenrollments (
  app_user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
  verified_source_email text NOT NULL UNIQUE,
  source_provider_user_id text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
ALTER TABLE public.identity_reenrollments ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.provision_app_user(p_provider_id text,p_profile_type text DEFAULT 'client',p_org_name text DEFAULT NULL,p_sector text DEFAULT NULL,p_profession text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE identity record; existing_id text; app_id text; org_id text;
BEGIN
  SELECT id::text,email,name,"emailVerified" AS verified INTO identity FROM neon_auth."user" WHERE id::text=p_provider_id AND coalesce(banned,false)=false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown provider identity' USING ERRCODE='42501'; END IF;
  SELECT app_user_id INTO existing_id FROM public.user_identities WHERE provider='neon' AND provider_user_id=p_provider_id;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  SELECT app_user_id INTO app_id FROM public.identity_reenrollments WHERE lower(verified_source_email)=lower(identity.email) AND claimed_at IS NULL FOR UPDATE;
  IF app_id IS NOT NULL THEN
    IF NOT identity.verified THEN RETURN NULL; END IF;
    IF EXISTS(SELECT 1 FROM public.users WHERE id=app_id AND account_closed_at IS NOT NULL) THEN RAISE EXCEPTION 'Closed account' USING ERRCODE='42501'; END IF;
    INSERT INTO public.user_identities(app_user_id,provider,provider_user_id,verified_at,linkage_method) VALUES(app_id,'neon',p_provider_id,now(),'verified_reenrollment');
    UPDATE public.identity_reenrollments SET claimed_at=now() WHERE app_user_id=app_id;
    RETURN app_id;
  END IF;
  IF EXISTS(SELECT 1 FROM public.users WHERE lower(email)=lower(identity.email)) THEN RAISE EXCEPTION 'Verified re-enrollment required' USING ERRCODE='42501'; END IF;
  IF p_profile_type NOT IN ('client','professional') THEN RAISE EXCEPTION 'Invalid profile'; END IF;
  app_id:=gen_random_uuid()::text;
  IF p_profile_type='professional' AND nullif(btrim(p_org_name),'') IS NOT NULL THEN
    org_id:=gen_random_uuid()::text;
    INSERT INTO public.organizations(id,name,industry,sector,profession,profile_type,is_public,country,created_at,updated_at)
    VALUES(org_id,p_org_name,coalesce(p_sector,'Non spécifié'),p_sector,p_profession,'professional',true,'France',now()::text,now()::text);
  END IF;
  INSERT INTO public.users(id,email,name,profile_type,organization_id,onboarding_completed,onboarding_step,subscription_tier,subscription_status,created_at,updated_at)
  VALUES(app_id,lower(identity.email),identity.name,p_profile_type,org_id,false,0,'free','inactive',now()::text,now()::text);
  INSERT INTO public.user_identities(app_user_id,provider,provider_user_id,verified_at,linkage_method) VALUES(app_id,'neon',p_provider_id,now(),'provider_signup');
  RETURN app_id;
END $$;
REVOKE ALL ON FUNCTION public.provision_app_user(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_app_user(text,text,text,text,text) TO monservice_runtime;

-- The self-service closure capability retains structural IDs and every business record.
CREATE FUNCTION public.close_current_account(p_confirmation_email text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE app_id text:=public.current_app_user_id(); subject public.users;
BEGIN
  SELECT * INTO subject FROM public.users WHERE id=app_id FOR UPDATE;
  IF app_id IS NULL OR lower(btrim(p_confirmation_email)) IS DISTINCT FROM lower(subject.email) THEN RAISE EXCEPTION 'Account confirmation denied' USING ERRCODE='42501'; END IF;
  UPDATE public.users SET account_closed_at=now(),name='Compte fermé',email='closed-'||app_id||'@account.invalid',password=NULL,updated_at=now()::text WHERE id=app_id;
  DELETE FROM public.user_roles WHERE user_id=app_id;
END $$;
REVOKE ALL ON FUNCTION public.close_current_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_current_account(text) TO monservice_runtime;

-- All tenant CRM capabilities require a professional. Membership alone is insufficient.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['clients','contacts','deals','products','tasks','message_templates','billing_document_sequences','invoice_sections','invoice_lines'] LOOP
    EXECUTE format('CREATE POLICY professional_mutations_required ON public.%I AS RESTRICTIVE FOR INSERT TO monservice_runtime WITH CHECK(public.current_profile_type()=''professional'')',t);
    EXECUTE format('CREATE POLICY professional_updates_required ON public.%I AS RESTRICTIVE FOR UPDATE TO monservice_runtime USING(public.current_profile_type()=''professional'') WITH CHECK(public.current_profile_type()=''professional'')',t);
    EXECUTE format('CREATE POLICY professional_deletes_required ON public.%I AS RESTRICTIVE FOR DELETE TO monservice_runtime USING(public.current_profile_type()=''professional'')',t);
  END LOOP;
END $$;
CREATE POLICY clients_subject_read ON public.clients FOR SELECT TO monservice_runtime USING(user_id=public.current_app_user_id());
CREATE POLICY invoices_recipient_read ON public.invoices FOR SELECT TO monservice_runtime USING(public.current_profile_type()='client' AND (recipient_user_id=public.current_app_user_id() OR EXISTS(SELECT 1 FROM public.clients c WHERE c.id=client_id AND c.user_id=public.current_app_user_id())));
CREATE POLICY invoice_lines_recipient_read ON public.invoice_lines FOR SELECT TO monservice_runtime USING(EXISTS(SELECT 1 FROM public.invoices i WHERE i.id=invoice_id AND public.current_profile_type()='client' AND (i.recipient_user_id=public.current_app_user_id() OR EXISTS(SELECT 1 FROM public.clients c WHERE c.id=i.client_id AND c.user_id=public.current_app_user_id()))));
CREATE POLICY users_self_update ON public.users FOR UPDATE TO monservice_runtime USING(id=public.current_app_user_id()) WITH CHECK(id=public.current_app_user_id());
CREATE POLICY organizations_owner_update ON public.organizations FOR UPDATE TO monservice_runtime USING(id=public.current_organization_id() AND public.current_profile_type()='professional') WITH CHECK(id=public.current_organization_id() AND public.current_profile_type()='professional');

-- RBAC is scoped to the stored actor/org, without exposing grants for other tenants.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_tenant_read ON public.roles FOR SELECT TO monservice_runtime USING(EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.role_id=roles.id AND ur.user_id=public.current_app_user_id() AND ur.organization_id=public.current_organization_id()));
CREATE POLICY permissions_catalog_read ON public.permissions FOR SELECT TO monservice_runtime USING(public.current_app_user_id() IS NOT NULL);
CREATE POLICY role_permissions_tenant_read ON public.role_permissions FOR SELECT TO monservice_runtime USING(EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.role_id=role_permissions.role_id AND ur.user_id=public.current_app_user_id() AND ur.organization_id=public.current_organization_id()));
CREATE POLICY user_roles_subject_read ON public.user_roles FOR SELECT TO monservice_runtime USING(user_id=public.current_app_user_id());
GRANT SELECT ON public.roles,public.permissions,public.role_permissions,public.user_roles TO monservice_runtime;

CREATE FUNCTION public.has_current_portal_access(p_org text,p_patient text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT public.current_profile_type()='client' AND EXISTS(SELECT 1 FROM public.patient_portal_access WHERE user_id=public.current_app_user_id() AND organization_id=p_org AND patient_id=p_patient AND is_active) $$;
REVOKE ALL ON FUNCTION public.has_current_portal_access(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_current_portal_access(text,text) TO monservice_runtime;
CREATE POLICY portal_shared_document_read ON public.clinical_documents FOR SELECT TO monservice_runtime USING(patient_visible AND NOT is_archived AND public.has_current_portal_access(organization_id,patient_id));
CREATE POLICY portal_appointment_read ON public.appointments FOR SELECT TO monservice_runtime USING(public.has_current_portal_access(organization_id,patient_id));
CREATE POLICY portal_patient_read ON public.patient_profiles FOR SELECT TO monservice_runtime USING(public.has_current_portal_access(organization_id,id));

-- Default function privileges must never silently publish future definer capabilities.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
