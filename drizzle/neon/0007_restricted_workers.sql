-- Separate login credentials are selected only by verified server routes.
-- Workers cannot assume the migration owner or read clinical notes/documents.
CREATE ROLE monservice_stripe LOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER;
CREATE ROLE monservice_reminders LOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER;
GRANT USAGE ON SCHEMA public TO monservice_stripe,monservice_reminders;

GRANT SELECT(id) ON public.users TO monservice_stripe;
GRANT UPDATE(stripe_customer_id,subscription_tier,subscription_status,updated_at) ON public.users TO monservice_stripe;
CREATE POLICY stripe_user_read ON public.users FOR SELECT TO monservice_stripe USING(id=nullif(current_setting('monservice.worker_subject_id',true),'') AND account_closed_at IS NULL);
CREATE POLICY stripe_user_write ON public.users FOR UPDATE TO monservice_stripe USING(id=nullif(current_setting('monservice.worker_subject_id',true),'') AND account_closed_at IS NULL) WITH CHECK(id=nullif(current_setting('monservice.worker_subject_id',true),'') AND account_closed_at IS NULL);
GRANT SELECT ON public.invoices,public.invoice_lines,public.invoice_sections TO monservice_stripe;
GRANT UPDATE(status,paid_at,payment_intent_id,amount_due,updated_at) ON public.invoices TO monservice_stripe;
CREATE POLICY stripe_invoice_read ON public.invoices FOR SELECT TO monservice_stripe USING(id=nullif(current_setting('monservice.worker_subject_id',true),''));
CREATE POLICY stripe_invoice_write ON public.invoices FOR UPDATE TO monservice_stripe USING(id=nullif(current_setting('monservice.worker_subject_id',true),'') AND type='invoice') WITH CHECK(id=nullif(current_setting('monservice.worker_subject_id',true),'') AND type='invoice');
CREATE POLICY stripe_line_read ON public.invoice_lines FOR SELECT TO monservice_stripe USING(invoice_id=nullif(current_setting('monservice.worker_subject_id',true),''));
CREATE POLICY stripe_section_read ON public.invoice_sections FOR SELECT TO monservice_stripe USING(invoice_id=nullif(current_setting('monservice.worker_subject_id',true),''));
GRANT SELECT,INSERT,DELETE ON public.stripe_events TO monservice_stripe;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY stripe_event_read ON public.stripe_events FOR SELECT TO monservice_stripe USING(id=nullif(current_setting('monservice.worker_event_id',true),''));
CREATE POLICY stripe_event_insert ON public.stripe_events FOR INSERT TO monservice_stripe WITH CHECK(id=nullif(current_setting('monservice.worker_event_id',true),''));
CREATE POLICY stripe_event_retry ON public.stripe_events FOR DELETE TO monservice_stripe USING(id=nullif(current_setting('monservice.worker_event_id',true),''));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['organizations','invoices','clients','appointments','appointment_types','practice_locations','practice_rooms','practice_practitioners','patient_profiles','patient_representatives','patient_representative_links','appointment_reminder_deliveries'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO monservice_reminders',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY reminder_worker_read ON public.%I FOR SELECT TO monservice_reminders USING(true)',t);
  END LOOP;
END $$;
GRANT INSERT ON public.appointment_reminder_deliveries TO monservice_reminders;
GRANT UPDATE(status,sent_at,provider_message_id) ON public.appointment_reminder_deliveries TO monservice_reminders;
CREATE POLICY reminder_worker_claim ON public.appointment_reminder_deliveries FOR INSERT TO monservice_reminders WITH CHECK(true);
CREATE POLICY reminder_worker_complete ON public.appointment_reminder_deliveries FOR UPDATE TO monservice_reminders USING(true) WITH CHECK(true);
