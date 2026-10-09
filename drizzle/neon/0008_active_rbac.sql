-- RBAC tables added after the historical policy export need the same closed
-- account boundary as every other user-facing table.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['user_roles','roles','permissions','role_permissions'] LOOP
    EXECUTE format('CREATE POLICY account_active_required ON public.%I AS RESTRICTIVE FOR ALL TO monservice_runtime USING(public.current_account_is_active()) WITH CHECK(public.current_account_is_active())',t);
  END LOOP;
END $$;
