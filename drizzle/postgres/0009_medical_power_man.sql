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
  FOR SELECT TO authenticated, anon
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
