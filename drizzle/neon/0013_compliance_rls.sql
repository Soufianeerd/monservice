-- Canonical compliance tables historically had grants without RLS. The direct
-- restricted runtime must not depend on service-layer filters for isolation.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breach_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_compliance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_subject_or_professional_read ON public.audit_logs FOR SELECT TO monservice_runtime
USING (user_id=public.current_app_user_id() OR (organization_id=public.current_organization_id() AND public.current_profile_type()='professional'));
CREATE POLICY audit_actor_insert ON public.audit_logs FOR INSERT TO monservice_runtime
WITH CHECK (user_id=public.current_app_user_id() AND (organization_id IS NULL OR organization_id=public.current_organization_id()));
CREATE POLICY consent_subject_or_professional_read ON public.consent_events FOR SELECT TO monservice_runtime
USING (user_id=public.current_app_user_id() OR (organization_id=public.current_organization_id() AND public.current_profile_type()='professional'));
CREATE POLICY consent_subject_insert ON public.consent_events FOR INSERT TO monservice_runtime
WITH CHECK (user_id=public.current_app_user_id() AND (organization_id IS NULL OR organization_id=public.current_organization_id()));
CREATE POLICY dsar_subject_or_professional_read ON public.data_subject_requests FOR SELECT TO monservice_runtime
USING (user_id=public.current_app_user_id() OR (organization_id=public.current_organization_id() AND public.current_profile_type()='professional'));
CREATE POLICY dsar_subject_insert ON public.data_subject_requests FOR INSERT TO monservice_runtime
WITH CHECK (user_id=public.current_app_user_id() AND (organization_id IS NULL OR organization_id=public.current_organization_id()) AND status='RECEIVED' AND processed_by IS NULL AND completed_at IS NULL);
CREATE POLICY processing_professional_all ON public.processing_activities FOR ALL TO monservice_runtime
USING (organization_id=public.current_organization_id() AND public.current_profile_type()='professional')
WITH CHECK (organization_id=public.current_organization_id() AND public.current_profile_type()='professional');
-- These are global reference tables, with SELECT-only runtime grants.
CREATE POLICY country_reference_read ON public.country_compliance_profiles FOR SELECT TO monservice_runtime USING (true);
CREATE POLICY retention_reference_read ON public.retention_policies FOR SELECT TO monservice_runtime USING (true);
-- The other three tables retain their canonical absence of runtime grants and
-- remain default-deny. No new business capability is introduced here.
DO $$ DECLARE relation text; BEGIN
  FOREACH relation IN ARRAY ARRAY['audit_logs','consent_events','data_subject_requests','processing_activities','archived_documents','breach_notifications','legal_entities','country_compliance_profiles','retention_policies'] LOOP
    EXECUTE format('CREATE POLICY account_active_required ON public.%I AS RESTRICTIVE FOR ALL TO monservice_runtime USING (public.current_account_is_active()) WITH CHECK (public.current_account_is_active())',relation);
  END LOOP;
END $$;
