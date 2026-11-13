-- Session 20 — portail client Field Service.
-- Additif : lecture seule pour le client de SES interventions (hors brouillons),
-- de ses sites, équipements, liens et comptes rendus finalisés ; table de
-- réception des travaux signée par le client. Aucune politique existante modifiée.

-- Vrai si la session est un compte client relié à cette fiche client.
CREATE FUNCTION public.is_current_field_service_client(p_organization_id text, p_client_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT public.current_profile_type() = 'client'
     AND public.current_app_user_id() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.clients c
        WHERE c.id = p_client_id
          AND c.organization_id = p_organization_id
          AND c.user_id = public.current_app_user_id()
     );
$function$;
REVOKE ALL ON FUNCTION public.is_current_field_service_client(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_field_service_client(text, text) TO monservice_runtime;

-- Vrai si l'opération est visible par le client courant (jamais un brouillon).
CREATE FUNCTION public.is_current_field_service_client_work_order(p_work_order_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.field_service_work_orders w
     WHERE w.id = p_work_order_id
       AND w.status <> 'draft'
       AND public.is_current_field_service_client(w.organization_id, w.client_id)
  );
$function$;
REVOKE ALL ON FUNCTION public.is_current_field_service_client_work_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_field_service_client_work_order(text) TO monservice_runtime;

CREATE POLICY "field_service_work_orders_client_read" ON public.field_service_work_orders
  AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (status <> 'draft' AND is_current_field_service_client(organization_id, client_id));
CREATE POLICY "field_service_sites_client_read" ON public.field_service_sites
  AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (is_current_field_service_client(organization_id, client_id));
CREATE POLICY "field_service_assets_client_read" ON public.field_service_assets
  AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (is_current_field_service_client(organization_id, client_id));
CREATE POLICY "field_service_work_order_assets_client_read" ON public.field_service_work_order_assets
  AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (is_current_field_service_client_work_order(work_order_id));
CREATE POLICY "field_service_reports_client_read" ON public.field_service_work_reports
  AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (status = 'finalized' AND is_current_field_service_client_work_order(work_order_id));

-- Réception des travaux : une seule par compte rendu finalisé, signée par le
-- client relié, immuable (aucun grant UPDATE/DELETE).
CREATE TABLE public.field_service_work_report_acknowledgements (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  work_report_id text NOT NULL REFERENCES public.field_service_work_reports(id),
  acknowledged_by_user_id text NOT NULL,
  signer_name text NOT NULL,
  decision text NOT NULL DEFAULT 'accepted',
  comment text,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT field_service_report_ack_signer_check CHECK (char_length(trim(signer_name)) >= 2 AND char_length(signer_name) <= 120),
  CONSTRAINT field_service_report_ack_decision_check CHECK (decision IN ('accepted', 'accepted_with_reservations')),
  CONSTRAINT field_service_report_ack_comment_check CHECK (comment IS NULL OR char_length(comment) <= 2000),
  CONSTRAINT field_service_report_ack_reservations_check CHECK (decision = 'accepted' OR (comment IS NOT NULL AND char_length(trim(comment)) >= 3)),
  CONSTRAINT field_service_report_ack_user_fk FOREIGN KEY (acknowledged_by_user_id) REFERENCES public.users(id)
);
CREATE UNIQUE INDEX field_service_report_ack_report_unique ON public.field_service_work_report_acknowledgements USING btree (work_report_id);
CREATE INDEX field_service_report_ack_org_idx ON public.field_service_work_report_acknowledgements USING btree (organization_id, acknowledged_at);

-- Garde : rapport finalisé, même organisation, signataire = session, horodatage serveur.
CREATE FUNCTION public.enforce_field_service_report_acknowledgement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  report public.field_service_work_reports;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Work report acknowledgements are immutable' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO report FROM public.field_service_work_reports WHERE id = NEW.work_report_id;
  IF report.id IS NULL OR report.status <> 'finalized' THEN
    RAISE EXCEPTION 'Only a finalized work report can be acknowledged' USING ERRCODE = '23514';
  END IF;
  IF report.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Acknowledgement organization mismatch' USING ERRCODE = '23514';
  END IF;
  IF public.current_app_user_id() IS NOT NULL AND NEW.acknowledged_by_user_id IS DISTINCT FROM public.current_app_user_id()::text THEN
    RAISE EXCEPTION 'The signer must be the authenticated user' USING ERRCODE = '42501';
  END IF;
  NEW.acknowledged_at := now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.enforce_field_service_report_acknowledgement() FROM PUBLIC;
CREATE TRIGGER trg_field_service_report_acknowledgement
  BEFORE INSERT OR UPDATE OR DELETE ON public.field_service_work_report_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION enforce_field_service_report_acknowledgement();
CREATE TRIGGER runtime_immutable_fields BEFORE UPDATE ON public.field_service_work_report_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION public.protect_runtime_fields();

ALTER TABLE public.field_service_work_report_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public.field_service_work_report_acknowledgements AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "field_service_report_ack_professional_read" ON public.field_service_work_report_acknowledgements AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (is_current_field_service_professional(organization_id));
CREATE POLICY "field_service_report_ack_client_read" ON public.field_service_work_report_acknowledgements AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (EXISTS (SELECT 1 FROM public.field_service_work_reports r WHERE r.id = field_service_work_report_acknowledgements.work_report_id AND is_current_field_service_client_work_order(r.work_order_id)));
CREATE POLICY "field_service_report_ack_client_insert" ON public.field_service_work_report_acknowledgements AS PERMISSIVE FOR INSERT TO monservice_runtime
  WITH CHECK (
    acknowledged_by_user_id = current_app_user_id()::text
    AND EXISTS (SELECT 1 FROM public.field_service_work_reports r
                 WHERE r.id = field_service_work_report_acknowledgements.work_report_id
                   AND r.organization_id = field_service_work_report_acknowledgements.organization_id
                   AND r.status = 'finalized' AND is_current_field_service_client_work_order(r.work_order_id))
  );

REVOKE ALL ON public.field_service_work_report_acknowledgements FROM PUBLIC;
GRANT SELECT, INSERT ON public.field_service_work_report_acknowledgements TO monservice_runtime;
