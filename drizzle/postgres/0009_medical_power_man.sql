ALTER TABLE "country_compliance_profiles" ALTER COLUMN "vat_standard" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "country_compliance_profiles" ALTER COLUMN "vat_reduced" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "country_compliance_profiles" ALTER COLUMN "vat_reduced_2" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "country_compliance_profiles" ALTER COLUMN "vat_reduced_3" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "value" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "quantity" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "unit_price" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "tax_rate" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "total_ht" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "total_ttc" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "total_ht" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "tax_amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "total_ttc" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "vat_rate" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit_price" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "tax_rate" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "tax_rate" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mfa_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mfa_secret";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, profile_type,
    onboarding_completed, onboarding_step,
    subscription_tier, subscription_status,
    created_at, updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data ->> 'profileType', 'client'),
    false, 0, 'free', 'inactive',
    now()::text, now()::text
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()::text;
$$;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients', 'contacts', 'deals', 'products',
    'invoices', 'tasks', 'message_templates'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (organization_id = public.current_organization_id())
         WITH CHECK (organization_id = public.current_organization_id())',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS users_self_access ON public.users;
--> statement-breakpoint
CREATE POLICY users_self_access ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid()::text OR organization_id = public.current_organization_id());
--> statement-breakpoint
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS organizations_read ON public.organizations;
--> statement-breakpoint
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO authenticated
  USING (is_public = true OR id = public.current_organization_id());
--> statement-breakpoint
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS invoice_lines_tenant_isolation ON public.invoice_lines;
--> statement-breakpoint
CREATE POLICY invoice_lines_tenant_isolation ON public.invoice_lines
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.organization_id = public.current_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.organization_id = public.current_organization_id()
  ));
--> statement-breakpoint
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS messages_participants_only ON public.messages;
--> statement-breakpoint
CREATE POLICY messages_participants_only ON public.messages
  FOR ALL TO authenticated
  USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text)
  WITH CHECK (sender_id = auth.uid()::text);
--> statement-breakpoint
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS requests_visibility ON public.requests;
--> statement-breakpoint
CREATE POLICY requests_visibility ON public.requests
  FOR SELECT TO authenticated
  USING (visibility = 'public' OR client_id = auth.uid()::text);
--> statement-breakpoint
DROP POLICY IF EXISTS requests_owner_write ON public.requests;
--> statement-breakpoint
CREATE POLICY requests_owner_write ON public.requests
  FOR ALL TO authenticated
  USING (client_id = auth.uid()::text)
  WITH CHECK (client_id = auth.uid()::text);
--> statement-breakpoint
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.users, public.organizations, public.clients, public.contacts, public.deals, public.products, public.invoices, public.invoice_lines, public.tasks, public.message_templates, public.messages, public.requests, public.stripe_events, public.audit_logs, public.data_subject_requests, public.country_compliance_profiles, public.consent_events, public.retention_policies, public.processing_activities FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;
--> statement-breakpoint
GRANT SELECT, UPDATE ON TABLE public.organizations TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deals TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoice_lines TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_templates TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.requests TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processing_activities TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.data_subject_requests TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.consent_events TO authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.country_compliance_profiles TO authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.retention_policies TO authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.current_organization_id() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;
