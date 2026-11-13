CREATE FUNCTION public.is_current_billing_recipient(p_invoice_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT public.current_profile_type()='client' AND EXISTS(
  SELECT 1 FROM public.invoices i WHERE i.id=p_invoice_id AND
  (i.recipient_user_id=public.current_app_user_id() OR EXISTS(SELECT 1 FROM public.clients c WHERE c.id=i.client_id AND c.organization_id=i.organization_id AND c.user_id=public.current_app_user_id()))) $$;
REVOKE ALL ON FUNCTION public.is_current_billing_recipient(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_billing_recipient(text) TO monservice_runtime;
CREATE POLICY invoices_read_authority ON public.invoices AS RESTRICTIVE FOR SELECT TO monservice_runtime USING((public.current_profile_type()='professional' AND organization_id=public.current_organization_id()) OR public.is_current_billing_recipient(id));
CREATE POLICY invoice_lines_read_authority ON public.invoice_lines AS RESTRICTIVE FOR SELECT TO monservice_runtime USING((public.current_profile_type()='professional' AND organization_id=public.current_organization_id()) OR public.is_current_billing_recipient(invoice_id));
CREATE POLICY invoice_sections_read_authority ON public.invoice_sections AS RESTRICTIVE FOR SELECT TO monservice_runtime USING((public.current_profile_type()='professional' AND organization_id=public.current_organization_id()) OR public.is_current_billing_recipient(invoice_id));
CREATE POLICY invoices_recipient_update ON public.invoices FOR UPDATE TO monservice_runtime USING(type='quote' AND public.is_current_billing_recipient(id)) WITH CHECK(type='quote' AND public.is_current_billing_recipient(id));
CREATE POLICY invoices_insert_professional ON public.invoices AS RESTRICTIVE FOR INSERT TO monservice_runtime WITH CHECK(public.current_profile_type()='professional');
CREATE POLICY invoices_delete_professional ON public.invoices AS RESTRICTIVE FOR DELETE TO monservice_runtime USING(public.current_profile_type()='professional');

CREATE FUNCTION public.protect_runtime_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public
AS $$ BEGIN
  IF current_user<>'monservice_runtime' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='users' THEN
    IF (to_jsonb(NEW)-ARRAY['name','onboarding_completed','onboarding_step','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['name','onboarding_completed','onboarding_step','updated_at']) THEN RAISE EXCEPTION 'Server-owned user fields' USING ERRCODE='42501'; END IF;
  ELSIF TG_TABLE_NAME='invoices' AND public.current_profile_type()='client' THEN
    IF OLD.type<>'quote' OR OLD.status NOT IN ('sent','viewed') OR NEW.status NOT IN ('viewed','accepted','rejected') OR NOT public.is_current_billing_recipient(OLD.id) THEN RAISE EXCEPTION 'Client document transition denied' USING ERRCODE='42501'; END IF;
    IF (to_jsonb(NEW)-ARRAY['status','signature','signature_ip','signature_date','signed_at','accepted_at','accepted_by_user_id','rejected_at','rejected_by_user_id','message','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','signature','signature_ip','signature_date','signed_at','accepted_at','accepted_by_user_id','rejected_at','rejected_by_user_id','message','updated_at']) THEN RAISE EXCEPTION 'Client commercial fields are immutable' USING ERRCODE='42501'; END IF;
    IF NEW.status='accepted' AND (nullif(NEW.signature,'') IS NULL OR NEW.accepted_by_user_id IS DISTINCT FROM public.current_app_user_id()) THEN RAISE EXCEPTION 'Verified signature required' USING ERRCODE='42501'; END IF;
    IF NEW.status='rejected' AND NEW.rejected_by_user_id IS DISTINCT FROM public.current_app_user_id() THEN RAISE EXCEPTION 'Verified recipient required' USING ERRCODE='42501'; END IF;
  END IF;
  IF to_jsonb(NEW)->'organization_id' IS DISTINCT FROM to_jsonb(OLD)->'organization_id' THEN RAISE EXCEPTION 'Tenant is immutable' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_runtime_fields() FROM PUBLIC;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='organization_id' LOOP
    EXECUTE format('CREATE TRIGGER runtime_immutable_fields BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.protect_runtime_fields()',t.table_name);
  END LOOP;
END $$;

CREATE FUNCTION public.quote_issuer_entitlement(p_quote_id text) RETURNS TABLE(id text,"subscriptionTier" text,"subscriptionStatus" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT u.id,u.subscription_tier,u.subscription_status FROM public.invoices i JOIN public.users u ON u.organization_id=i.organization_id AND u.profile_type='professional'
WHERE i.id=p_quote_id AND i.type='quote' AND public.is_current_billing_recipient(i.id) AND u.account_closed_at IS NULL ORDER BY (u.id=i.created_by_user_id) DESC LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.quote_issuer_entitlement(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_issuer_entitlement(text) TO monservice_runtime;

CREATE FUNCTION public.sync_current_quote_deal(p_quote_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE doc public.invoices; BEGIN
  SELECT * INTO doc FROM public.invoices WHERE id=p_quote_id AND type='quote' FOR SHARE;
  IF NOT public.is_current_billing_recipient(p_quote_id) OR (doc.status='accepted' AND doc.accepted_by_user_id IS DISTINCT FROM public.current_app_user_id()) OR (doc.status='rejected' AND doc.rejected_by_user_id IS DISTINCT FROM public.current_app_user_id()) OR doc.status NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'Quote capability denied' USING ERRCODE='42501'; END IF;
  UPDATE public.deals SET status=CASE WHEN doc.status='accepted' THEN 'won' ELSE 'lost' END,updated_at=now()::text WHERE id=doc.deal_id AND organization_id=doc.organization_id;
END $$;
REVOKE ALL ON FUNCTION public.sync_current_quote_deal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_current_quote_deal(text) TO monservice_runtime;

-- Portal reference rows can only be read when linked to an authorized appointment.
CREATE POLICY portal_appointment_type_read ON public.appointment_types FOR SELECT TO monservice_runtime USING(EXISTS(SELECT 1 FROM public.appointments a WHERE a.appointment_type_id=appointment_types.id AND a.organization_id=appointment_types.organization_id AND public.has_current_portal_access(a.organization_id,a.patient_id)));
CREATE POLICY portal_location_read ON public.practice_locations FOR SELECT TO monservice_runtime USING(EXISTS(SELECT 1 FROM public.appointments a WHERE a.location_id=practice_locations.id AND a.organization_id=practice_locations.organization_id AND public.has_current_portal_access(a.organization_id,a.patient_id)));
CREATE POLICY portal_room_read ON public.practice_rooms FOR SELECT TO monservice_runtime USING(EXISTS(SELECT 1 FROM public.appointments a WHERE a.room_id=practice_rooms.id AND a.organization_id=practice_rooms.organization_id AND public.has_current_portal_access(a.organization_id,a.patient_id)));
