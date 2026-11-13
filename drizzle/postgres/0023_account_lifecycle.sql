ALTER TABLE "users" ADD COLUMN "account_closed_at" timestamp with time zone;
--> statement-breakpoint
CREATE FUNCTION public.current_account_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND account_closed_at IS NULL); $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_account_is_active() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_account_is_active() TO authenticated;
--> statement-breakpoint
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relrowsecurity AND c.relkind = 'r'
      AND (n.nspname = 'public' OR (n.nspname = 'storage' AND c.relname = 'objects'))
      AND EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polpermissive)
  LOOP
    EXECUTE format('CREATE POLICY account_active_required ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.current_account_is_active()) WITH CHECK (public.current_account_is_active())', target.nspname, target.relname);
  END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION public.protect_account_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public
AS $$ BEGIN
  IF current_user = 'authenticated' AND NEW.account_closed_at IS DISTINCT FROM OLD.account_closed_at THEN
    RAISE EXCEPTION 'Account lifecycle is server owned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.protect_account_lifecycle() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER users_account_lifecycle_guard BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_account_lifecycle();
--> statement-breakpoint
-- Number allocation is a server capability. This SECURITY DEFINER RPC must not
-- bypass tenant/account policies for bearer-token clients.
REVOKE EXECUTE ON FUNCTION public.allocate_billing_document_number(text, text, integer) FROM authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.allocate_billing_document_number(text, text, integer) TO service_role;
