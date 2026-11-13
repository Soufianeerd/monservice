-- appointment_types/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."appointment_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."appointment_types" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- appointment_types/appointment_types_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."appointment_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointment_types_tenant_isolation" ON public."appointment_types" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- appointment_waitlist_entries/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."appointment_waitlist_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."appointment_waitlist_entries" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- appointment_waitlist_entries/appointment_waitlist_entries_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."appointment_waitlist_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointment_waitlist_entries_tenant_isolation" ON public."appointment_waitlist_entries" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- appointments/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."appointments" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- appointments/appointments_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_tenant_isolation" ON public."appointments" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- billing_document_sequences/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."billing_document_sequences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."billing_document_sequences" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- billing_document_sequences/billing_sequences_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."billing_document_sequences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_sequences_tenant_isolation" ON public."billing_document_sequences" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- care_episodes/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."care_episodes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."care_episodes" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- care_episodes/care_episodes_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."care_episodes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_episodes_insert_owner_only" ON public."care_episodes" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- care_episodes/care_episodes_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."care_episodes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_episodes_select_owner_only" ON public."care_episodes" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- care_episodes/care_episodes_update_owner_only: UPDATE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."care_episodes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_episodes_update_owner_only" ON public."care_episodes" AS PERMISSIVE FOR UPDATE TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id()))) WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clients/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clients" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clients/clients_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_tenant_isolation" ON public."clients" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- clinical_documents/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clinical_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clinical_documents" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clinical_documents/clinical_documents_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_documents_insert_owner_only" ON public."clinical_documents" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_documents/clinical_documents_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_documents_select_owner_only" ON public."clinical_documents" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_documents/clinical_documents_update_owner_only: UPDATE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_documents_update_owner_only" ON public."clinical_documents" AS PERMISSIVE FOR UPDATE TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id()))) WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_encounters/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clinical_encounters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clinical_encounters" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clinical_encounters/clinical_encounters_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_encounters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_encounters_insert_owner_only" ON public."clinical_encounters" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_encounters/clinical_encounters_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_encounters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_encounters_select_owner_only" ON public."clinical_encounters" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_form_responses/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_responses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clinical_form_responses" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clinical_form_responses/clinical_form_responses_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_responses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_form_responses_insert_owner_only" ON public."clinical_form_responses" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_form_responses/clinical_form_responses_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_responses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_form_responses_select_owner_only" ON public."clinical_form_responses" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_form_responses/clinical_form_responses_update_owner_only: UPDATE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_responses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_form_responses_update_owner_only" ON public."clinical_form_responses" AS PERMISSIVE FOR UPDATE TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id()))) WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_form_templates/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clinical_form_templates" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clinical_form_templates/clinical_form_templates_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_form_templates_insert_owner_only" ON public."clinical_form_templates" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_form_templates/clinical_form_templates_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_form_templates_select_owner_only" ON public."clinical_form_templates" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_form_templates/clinical_form_templates_update_owner_only: UPDATE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_form_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_form_templates_update_owner_only" ON public."clinical_form_templates" AS PERMISSIVE FOR UPDATE TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id()))) WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_measurements/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clinical_measurements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clinical_measurements" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clinical_measurements/clinical_measurements_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_measurements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_measurements_insert_owner_only" ON public."clinical_measurements" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_measurements/clinical_measurements_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_measurements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_measurements_select_owner_only" ON public."clinical_measurements" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- clinical_notes/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."clinical_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."clinical_notes" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- clinical_notes/clinical_notes_insert_owner_only: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_notes_insert_owner_only" ON public."clinical_notes" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((organization_id = current_organization_id()) AND (author_practitioner_id = current_clinical_practitioner_id())));

-- clinical_notes/clinical_notes_select_owner_only: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_notes_select_owner_only" ON public."clinical_notes" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((organization_id = current_organization_id()) AND (author_practitioner_id = current_clinical_practitioner_id())));

-- clinical_notes/clinical_notes_update_owner_only: UPDATE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."clinical_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_notes_update_owner_only" ON public."clinical_notes" AS PERMISSIVE FOR UPDATE TO monservice_runtime USING (((organization_id = current_organization_id()) AND (author_practitioner_id = current_clinical_practitioner_id()))) WITH CHECK (((organization_id = current_organization_id()) AND (author_practitioner_id = current_clinical_practitioner_id())));

-- contacts/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."contacts" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- contacts/contacts_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_tenant_isolation" ON public."contacts" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- deals/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."deals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."deals" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- deals/deals_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."deals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_tenant_isolation" ON public."deals" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- field_service_sites/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."field_service_sites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."field_service_sites" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- field_service_sites/field_service_sites_professional_policy: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."field_service_sites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_service_sites_professional_policy" ON public."field_service_sites" AS PERMISSIVE FOR ALL TO monservice_runtime USING (is_current_field_service_professional(organization_id)) WITH CHECK (is_current_field_service_professional(organization_id));

-- field_service_work_order_assignments/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_order_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."field_service_work_order_assignments" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- field_service_work_order_assignments/field_service_assignments_professional_policy: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_order_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_service_assignments_professional_policy" ON public."field_service_work_order_assignments" AS PERMISSIVE FOR ALL TO monservice_runtime USING (is_current_field_service_professional(organization_id)) WITH CHECK (is_current_field_service_professional(organization_id));

-- field_service_work_order_status_history/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_order_status_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."field_service_work_order_status_history" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- field_service_work_order_status_history/field_service_status_history_professional_policy: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_order_status_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_service_status_history_professional_policy" ON public."field_service_work_order_status_history" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (is_current_field_service_professional(organization_id));

-- field_service_work_orders/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."field_service_work_orders" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- field_service_work_orders/field_service_work_orders_professional_policy: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_service_work_orders_professional_policy" ON public."field_service_work_orders" AS PERMISSIVE FOR ALL TO monservice_runtime USING (is_current_field_service_professional(organization_id)) WITH CHECK (is_current_field_service_professional(organization_id));

-- field_service_work_reports/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."field_service_work_reports" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- field_service_work_reports/field_service_reports_professional_policy: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."field_service_work_reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_service_reports_professional_policy" ON public."field_service_work_reports" AS PERMISSIVE FOR ALL TO monservice_runtime USING (is_current_field_service_professional(organization_id)) WITH CHECK (is_current_field_service_professional(organization_id));

-- invoice_lines/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."invoice_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."invoice_lines" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- invoice_lines/invoice_lines_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."invoice_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_lines_tenant_isolation" ON public."invoice_lines" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_lines.invoice_id) AND (i.organization_id = current_organization_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_lines.invoice_id) AND (i.organization_id = current_organization_id())))));

-- invoice_sections/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."invoice_sections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."invoice_sections" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- invoice_sections/invoice_sections_client_recipient_select: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."invoice_sections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_sections_client_recipient_select" ON public."invoice_sections" AS PERMISSIVE FOR SELECT TO monservice_runtime USING ((EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_sections.invoice_id) AND ((i.recipient_user_id = (public.current_app_user_id())::text) OR (EXISTS ( SELECT 1
           FROM clients c
          WHERE ((c.id = i.client_id) AND (c.user_id = (public.current_app_user_id())::text)))))))));

-- invoice_sections/invoice_sections_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."invoice_sections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_sections_tenant_isolation" ON public."invoice_sections" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- invoices/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."invoices" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- invoices/invoices_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_tenant_isolation" ON public."invoices" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- message_templates/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."message_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."message_templates" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- message_templates/message_templates_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."message_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_templates_tenant_isolation" ON public."message_templates" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- messages/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."messages" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- messages/messages_delete_policy: DELETE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_delete_policy" ON public."messages" AS PERMISSIVE FOR DELETE TO monservice_runtime USING (((patient_id IS NULL) AND (sender_id = (public.current_app_user_id())::text)));

-- messages/messages_insert_policy: INSERT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_insert_policy" ON public."messages" AS PERMISSIVE FOR INSERT TO monservice_runtime WITH CHECK (((sender_id = (public.current_app_user_id())::text) AND can_insert_patient_message(sender_id, receiver_id, patient_id, organization_id)));

-- messages/messages_select_policy: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_policy" ON public."messages" AS PERMISSIVE FOR SELECT TO monservice_runtime USING ((((patient_id IS NULL) AND ((sender_id = (public.current_app_user_id())::text) OR (receiver_id = (public.current_app_user_id())::text))) OR ((patient_id IS NOT NULL) AND ((((sender_id = (public.current_app_user_id())::text) OR (receiver_id = (public.current_app_user_id())::text)) AND (EXISTS ( SELECT 1
   FROM (users u
     JOIN patient_portal_access ppa ON (((ppa.user_id = u.id) AND (ppa.patient_id = messages.patient_id) AND (ppa.organization_id = messages.organization_id) AND (ppa.is_active = true))))
  WHERE ((u.id = (public.current_app_user_id())::text) AND (u.profile_type = 'client'::text))))) OR (((sender_id = (public.current_app_user_id())::text) OR (receiver_id = (public.current_app_user_id())::text)) AND (EXISTS ( SELECT 1
   FROM (practice_practitioners pp
     JOIN care_episodes ce ON (((ce.organization_id = messages.organization_id) AND (ce.patient_id = messages.patient_id) AND (ce.practitioner_id = pp.id))))
  WHERE ((pp.user_id = (public.current_app_user_id())::text) AND (pp.id = current_clinical_practitioner_id()) AND (pp.is_active = true)))))))));

-- messages/messages_update_policy: UPDATE, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_update_policy" ON public."messages" AS PERMISSIVE FOR UPDATE TO monservice_runtime USING ((((patient_id IS NULL) AND ((sender_id = (public.current_app_user_id())::text) OR (receiver_id = (public.current_app_user_id())::text))) OR ((patient_id IS NOT NULL) AND (receiver_id = (public.current_app_user_id())::text) AND ((EXISTS ( SELECT 1
   FROM (users u
     JOIN patient_portal_access ppa ON (((ppa.user_id = u.id) AND (ppa.patient_id = messages.patient_id) AND (ppa.organization_id = messages.organization_id) AND (ppa.is_active = true))))
  WHERE ((u.id = (public.current_app_user_id())::text) AND (u.profile_type = 'client'::text)))) OR (EXISTS ( SELECT 1
   FROM (practice_practitioners pp
     JOIN care_episodes ce ON (((ce.organization_id = messages.organization_id) AND (ce.patient_id = messages.patient_id) AND (ce.practitioner_id = pp.id))))
  WHERE ((pp.user_id = (public.current_app_user_id())::text) AND (pp.id = current_clinical_practitioner_id()) AND (pp.is_active = true)))))))) WITH CHECK ((((patient_id IS NULL) AND ((sender_id = (public.current_app_user_id())::text) OR (receiver_id = (public.current_app_user_id())::text))) OR ((patient_id IS NOT NULL) AND (receiver_id = (public.current_app_user_id())::text) AND ((EXISTS ( SELECT 1
   FROM (users u
     JOIN patient_portal_access ppa ON (((ppa.user_id = u.id) AND (ppa.patient_id = messages.patient_id) AND (ppa.organization_id = messages.organization_id) AND (ppa.is_active = true))))
  WHERE ((u.id = (public.current_app_user_id())::text) AND (u.profile_type = 'client'::text)))) OR (EXISTS ( SELECT 1
   FROM (practice_practitioners pp
     JOIN care_episodes ce ON (((ce.organization_id = messages.organization_id) AND (ce.patient_id = messages.patient_id) AND (ce.practitioner_id = pp.id))))
  WHERE ((pp.user_id = (public.current_app_user_id())::text) AND (pp.id = current_clinical_practitioner_id()) AND (pp.is_active = true))))))));

-- organizations/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."organizations" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- organizations/organizations_read: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_read" ON public."organizations" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((is_public = true) OR (id = current_organization_id())));

-- patient_billing_links/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."patient_billing_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."patient_billing_links" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- patient_billing_links/patient_billing_links_practitioner_all: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_billing_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_billing_links_practitioner_all" ON public."patient_billing_links" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (current_clinical_practitioner_id() IS NOT NULL))) WITH CHECK (((organization_id = current_organization_id()) AND (current_clinical_practitioner_id() IS NOT NULL)));

-- patient_portal_access/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."patient_portal_access" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."patient_portal_access" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- patient_portal_access/patient_portal_access_practitioner_all: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_portal_access" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_portal_access_practitioner_all" ON public."patient_portal_access" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (current_clinical_practitioner_id() IS NOT NULL))) WITH CHECK (((organization_id = current_organization_id()) AND (current_clinical_practitioner_id() IS NOT NULL)));

-- patient_portal_access/patient_portal_access_user_select: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_portal_access" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_portal_access_user_select" ON public."patient_portal_access" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((user_id = (public.current_app_user_id())::text) AND (is_active = true) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.profile_type = 'client'::text))))));

-- patient_profiles/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."patient_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."patient_profiles" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- patient_profiles/patient_profiles_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_profiles_tenant_isolation" ON public."patient_profiles" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- patient_questionnaire_assignments/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."patient_questionnaire_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."patient_questionnaire_assignments" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- patient_questionnaire_assignments/patient_questionnaires_practitioner_all: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_questionnaire_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_questionnaires_practitioner_all" ON public."patient_questionnaire_assignments" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id()))) WITH CHECK (((organization_id = current_organization_id()) AND (practitioner_id = current_clinical_practitioner_id())));

-- patient_questionnaire_assignments/patient_questionnaires_user_select: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_questionnaire_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_questionnaires_user_select" ON public."patient_questionnaire_assignments" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.profile_type = 'client'::text)))) AND (patient_id IN ( SELECT ppa.patient_id
   FROM patient_portal_access ppa
  WHERE ((ppa.user_id = (public.current_app_user_id())::text) AND (ppa.is_active = true))))));

-- patient_representative_links/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."patient_representative_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."patient_representative_links" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- patient_representative_links/patient_representative_links_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_representative_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_representative_links_tenant_isolation" ON public."patient_representative_links" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- patient_representatives/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."patient_representatives" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."patient_representatives" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- patient_representatives/patient_representatives_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."patient_representatives" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_representatives_tenant_isolation" ON public."patient_representatives" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- practice_locations/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practice_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practice_locations" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practice_locations/practice_locations_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practice_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_locations_tenant_isolation" ON public."practice_locations" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- practice_practitioners/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practice_practitioners" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practice_practitioners" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practice_practitioners/practice_practitioners_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practice_practitioners" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_practitioners_tenant_isolation" ON public."practice_practitioners" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))) AND ((user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM users target_user
  WHERE ((target_user.id = practice_practitioners.user_id) AND (target_user.organization_id = current_organization_id()) AND (target_user.profile_type = 'professional'::text)))))));

-- practice_resources/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practice_resources" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practice_resources" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practice_resources/practice_resources_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practice_resources" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_resources_tenant_isolation" ON public."practice_resources" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- practice_rooms/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practice_rooms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practice_rooms" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practice_rooms/practice_rooms_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practice_rooms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_rooms_tenant_isolation" ON public."practice_rooms" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- practitioner_availability_exceptions/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practitioner_availability_exceptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practitioner_availability_exceptions" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practitioner_availability_exceptions/practitioner_availability_exceptions_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practitioner_availability_exceptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practitioner_availability_exceptions_tenant_isolation" ON public."practitioner_availability_exceptions" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- practitioner_availability_rules/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practitioner_availability_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practitioner_availability_rules" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practitioner_availability_rules/practitioner_availability_rules_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practitioner_availability_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practitioner_availability_rules_tenant_isolation" ON public."practitioner_availability_rules" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- practitioner_locations/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."practitioner_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."practitioner_locations" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- practitioner_locations/practitioner_locations_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."practitioner_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practitioner_locations_tenant_isolation" ON public."practitioner_locations" AS PERMISSIVE FOR ALL TO monservice_runtime USING (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text)))))) WITH CHECK (((organization_id = current_organization_id()) AND (EXISTS ( SELECT 1
   FROM users caller
  WHERE ((caller.id = (public.current_app_user_id())::text) AND (caller.organization_id = current_organization_id()) AND (caller.profile_type = 'professional'::text))))));

-- products/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."products" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- products/products_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_tenant_isolation" ON public."products" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- requests/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."requests" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- requests/requests_owner_write: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_owner_write" ON public."requests" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((client_id = (public.current_app_user_id())::text)) WITH CHECK ((client_id = (public.current_app_user_id())::text));

-- requests/requests_visibility: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_visibility" ON public."requests" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((visibility = 'public'::text) OR (client_id = (public.current_app_user_id())::text)));

-- tasks/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."tasks" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- tasks/tasks_tenant_isolation: ALL, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_tenant_isolation" ON public."tasks" AS PERMISSIVE FOR ALL TO monservice_runtime USING ((organization_id = current_organization_id())) WITH CHECK ((organization_id = current_organization_id()));

-- users/account_active_required: ALL, RESTRICTIVE; canonical domain predicate.
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public."users" AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());

-- users/users_self_access: SELECT, PERMISSIVE; canonical domain predicate.
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_self_access" ON public."users" AS PERMISSIVE FOR SELECT TO monservice_runtime USING (((id = (public.current_app_user_id())::text) OR (organization_id = current_organization_id())));
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, monservice_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, monservice_runtime;
GRANT USAGE ON SCHEMA public TO monservice_runtime;
GRANT INSERT ON public."appointment_types" TO monservice_runtime;
GRANT SELECT ON public."appointment_types" TO monservice_runtime;
GRANT UPDATE ON public."appointment_types" TO monservice_runtime;
GRANT INSERT ON public."appointment_waitlist_entries" TO monservice_runtime;
GRANT SELECT ON public."appointment_waitlist_entries" TO monservice_runtime;
GRANT UPDATE ON public."appointment_waitlist_entries" TO monservice_runtime;
GRANT INSERT ON public."appointments" TO monservice_runtime;
GRANT SELECT ON public."appointments" TO monservice_runtime;
GRANT UPDATE ON public."appointments" TO monservice_runtime;
GRANT INSERT ON public."audit_logs" TO monservice_runtime;
GRANT SELECT ON public."audit_logs" TO monservice_runtime;
GRANT INSERT ON public."billing_document_sequences" TO monservice_runtime;
GRANT SELECT ON public."billing_document_sequences" TO monservice_runtime;
GRANT UPDATE ON public."billing_document_sequences" TO monservice_runtime;
GRANT INSERT ON public."care_episodes" TO monservice_runtime;
GRANT SELECT ON public."care_episodes" TO monservice_runtime;
GRANT UPDATE ON public."care_episodes" TO monservice_runtime;
GRANT DELETE ON public."clients" TO monservice_runtime;
GRANT INSERT ON public."clients" TO monservice_runtime;
GRANT SELECT ON public."clients" TO monservice_runtime;
GRANT UPDATE ON public."clients" TO monservice_runtime;
GRANT INSERT ON public."clinical_documents" TO monservice_runtime;
GRANT SELECT ON public."clinical_documents" TO monservice_runtime;
GRANT UPDATE ON public."clinical_documents" TO monservice_runtime;
GRANT INSERT ON public."clinical_encounters" TO monservice_runtime;
GRANT SELECT ON public."clinical_encounters" TO monservice_runtime;
GRANT INSERT ON public."clinical_form_responses" TO monservice_runtime;
GRANT SELECT ON public."clinical_form_responses" TO monservice_runtime;
GRANT UPDATE ON public."clinical_form_responses" TO monservice_runtime;
GRANT INSERT ON public."clinical_form_templates" TO monservice_runtime;
GRANT SELECT ON public."clinical_form_templates" TO monservice_runtime;
GRANT UPDATE ON public."clinical_form_templates" TO monservice_runtime;
GRANT INSERT ON public."clinical_measurements" TO monservice_runtime;
GRANT SELECT ON public."clinical_measurements" TO monservice_runtime;
GRANT INSERT ON public."clinical_notes" TO monservice_runtime;
GRANT SELECT ON public."clinical_notes" TO monservice_runtime;
GRANT UPDATE ON public."clinical_notes" TO monservice_runtime;
GRANT INSERT ON public."consent_events" TO monservice_runtime;
GRANT SELECT ON public."consent_events" TO monservice_runtime;
GRANT DELETE ON public."contacts" TO monservice_runtime;
GRANT INSERT ON public."contacts" TO monservice_runtime;
GRANT SELECT ON public."contacts" TO monservice_runtime;
GRANT UPDATE ON public."contacts" TO monservice_runtime;
GRANT SELECT ON public."country_compliance_profiles" TO monservice_runtime;
GRANT INSERT ON public."data_subject_requests" TO monservice_runtime;
GRANT SELECT ON public."data_subject_requests" TO monservice_runtime;
GRANT DELETE ON public."deals" TO monservice_runtime;
GRANT INSERT ON public."deals" TO monservice_runtime;
GRANT SELECT ON public."deals" TO monservice_runtime;
GRANT UPDATE ON public."deals" TO monservice_runtime;
GRANT INSERT ON public."field_service_sites" TO monservice_runtime;
GRANT SELECT ON public."field_service_sites" TO monservice_runtime;
GRANT UPDATE ON public."field_service_sites" TO monservice_runtime;
GRANT INSERT ON public."field_service_work_order_assignments" TO monservice_runtime;
GRANT SELECT ON public."field_service_work_order_assignments" TO monservice_runtime;
GRANT UPDATE ON public."field_service_work_order_assignments" TO monservice_runtime;
GRANT SELECT ON public."field_service_work_order_status_history" TO monservice_runtime;
GRANT INSERT ON public."field_service_work_orders" TO monservice_runtime;
GRANT SELECT ON public."field_service_work_orders" TO monservice_runtime;
GRANT UPDATE ON public."field_service_work_orders" TO monservice_runtime;
GRANT INSERT ON public."field_service_work_reports" TO monservice_runtime;
GRANT SELECT ON public."field_service_work_reports" TO monservice_runtime;
GRANT UPDATE ON public."field_service_work_reports" TO monservice_runtime;
GRANT DELETE ON public."invoice_lines" TO monservice_runtime;
GRANT INSERT ON public."invoice_lines" TO monservice_runtime;
GRANT SELECT ON public."invoice_lines" TO monservice_runtime;
GRANT UPDATE ON public."invoice_lines" TO monservice_runtime;
GRANT DELETE ON public."invoice_sections" TO monservice_runtime;
GRANT INSERT ON public."invoice_sections" TO monservice_runtime;
GRANT SELECT ON public."invoice_sections" TO monservice_runtime;
GRANT UPDATE ON public."invoice_sections" TO monservice_runtime;
GRANT DELETE ON public."invoices" TO monservice_runtime;
GRANT INSERT ON public."invoices" TO monservice_runtime;
GRANT SELECT ON public."invoices" TO monservice_runtime;
GRANT UPDATE ON public."invoices" TO monservice_runtime;
GRANT DELETE ON public."message_templates" TO monservice_runtime;
GRANT INSERT ON public."message_templates" TO monservice_runtime;
GRANT SELECT ON public."message_templates" TO monservice_runtime;
GRANT UPDATE ON public."message_templates" TO monservice_runtime;
GRANT DELETE ON public."messages" TO monservice_runtime;
GRANT INSERT ON public."messages" TO monservice_runtime;
GRANT SELECT ON public."messages" TO monservice_runtime;
GRANT UPDATE ON public."messages" TO monservice_runtime;
GRANT SELECT ON public."organizations" TO monservice_runtime;
GRANT UPDATE ON public."organizations" TO monservice_runtime;
GRANT INSERT ON public."patient_billing_links" TO monservice_runtime;
GRANT SELECT ON public."patient_billing_links" TO monservice_runtime;
GRANT UPDATE ON public."patient_billing_links" TO monservice_runtime;
GRANT INSERT ON public."patient_portal_access" TO monservice_runtime;
GRANT SELECT ON public."patient_portal_access" TO monservice_runtime;
GRANT UPDATE ON public."patient_portal_access" TO monservice_runtime;
GRANT INSERT ON public."patient_profiles" TO monservice_runtime;
GRANT SELECT ON public."patient_profiles" TO monservice_runtime;
GRANT UPDATE ON public."patient_profiles" TO monservice_runtime;
GRANT INSERT ON public."patient_questionnaire_assignments" TO monservice_runtime;
GRANT SELECT ON public."patient_questionnaire_assignments" TO monservice_runtime;
GRANT UPDATE ON public."patient_questionnaire_assignments" TO monservice_runtime;
GRANT INSERT ON public."patient_representative_links" TO monservice_runtime;
GRANT SELECT ON public."patient_representative_links" TO monservice_runtime;
GRANT UPDATE ON public."patient_representative_links" TO monservice_runtime;
GRANT INSERT ON public."patient_representatives" TO monservice_runtime;
GRANT SELECT ON public."patient_representatives" TO monservice_runtime;
GRANT UPDATE ON public."patient_representatives" TO monservice_runtime;
GRANT INSERT ON public."practice_locations" TO monservice_runtime;
GRANT SELECT ON public."practice_locations" TO monservice_runtime;
GRANT UPDATE ON public."practice_locations" TO monservice_runtime;
GRANT INSERT ON public."practice_practitioners" TO monservice_runtime;
GRANT SELECT ON public."practice_practitioners" TO monservice_runtime;
GRANT UPDATE ON public."practice_practitioners" TO monservice_runtime;
GRANT INSERT ON public."practice_resources" TO monservice_runtime;
GRANT SELECT ON public."practice_resources" TO monservice_runtime;
GRANT UPDATE ON public."practice_resources" TO monservice_runtime;
GRANT INSERT ON public."practice_rooms" TO monservice_runtime;
GRANT SELECT ON public."practice_rooms" TO monservice_runtime;
GRANT UPDATE ON public."practice_rooms" TO monservice_runtime;
GRANT INSERT ON public."practitioner_availability_exceptions" TO monservice_runtime;
GRANT SELECT ON public."practitioner_availability_exceptions" TO monservice_runtime;
GRANT UPDATE ON public."practitioner_availability_exceptions" TO monservice_runtime;
GRANT INSERT ON public."practitioner_availability_rules" TO monservice_runtime;
GRANT SELECT ON public."practitioner_availability_rules" TO monservice_runtime;
GRANT UPDATE ON public."practitioner_availability_rules" TO monservice_runtime;
GRANT INSERT ON public."practitioner_locations" TO monservice_runtime;
GRANT SELECT ON public."practitioner_locations" TO monservice_runtime;
GRANT UPDATE ON public."practitioner_locations" TO monservice_runtime;
GRANT DELETE ON public."processing_activities" TO monservice_runtime;
GRANT INSERT ON public."processing_activities" TO monservice_runtime;
GRANT SELECT ON public."processing_activities" TO monservice_runtime;
GRANT UPDATE ON public."processing_activities" TO monservice_runtime;
GRANT DELETE ON public."products" TO monservice_runtime;
GRANT INSERT ON public."products" TO monservice_runtime;
GRANT SELECT ON public."products" TO monservice_runtime;
GRANT UPDATE ON public."products" TO monservice_runtime;
GRANT DELETE ON public."requests" TO monservice_runtime;
GRANT INSERT ON public."requests" TO monservice_runtime;
GRANT SELECT ON public."requests" TO monservice_runtime;
GRANT UPDATE ON public."requests" TO monservice_runtime;
GRANT SELECT ON public."retention_policies" TO monservice_runtime;
GRANT DELETE ON public."tasks" TO monservice_runtime;
GRANT INSERT ON public."tasks" TO monservice_runtime;
GRANT SELECT ON public."tasks" TO monservice_runtime;
GRANT UPDATE ON public."tasks" TO monservice_runtime;
GRANT SELECT ON public."users" TO monservice_runtime;
GRANT UPDATE ON public."users" TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."allocate_billing_document_number"(p_organization_id text, p_document_type text, p_year integer) TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."can_insert_patient_message"(p_sender_id text, p_receiver_id text, p_patient_id text, p_organization_id text) TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."current_account_is_active"() TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."current_clinical_practitioner_id"() TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."current_organization_id"() TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."has_patient_practitioner_relationship"(p_organization_id text, p_patient_id text, p_practitioner_id text, p_require_active boolean) TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public."is_current_field_service_professional"(p_organization_id text) TO monservice_runtime;
GRANT EXECUTE ON FUNCTION public.current_app_user_id(),public.current_profile_type() TO monservice_runtime;
