-- Invitation d'un client au portail (tous workspaces).
-- Jusqu'ici, aucun parcours ne reliait un compte client à sa fiche
-- (clients.user_id n'était renseigné que par le seed) : le portail client
-- (devis, factures, interventions, équipements) restait vide en réalité.
-- Additif : nouvelle table + fonctions SECURITY DEFINER bornées. Aucune
-- politique existante modifiée ; clients.user_id reste non modifiable par
-- le rôle runtime en dehors de ces fonctions.

CREATE TABLE public.client_portal_invitations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  client_id text NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL,
  created_by_user_id text NOT NULL REFERENCES public.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  accepted_by_user_id text REFERENCES public.users(id),
  revoked_at timestamp with time zone,
  CONSTRAINT client_portal_invitations_client_fk FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id),
  CONSTRAINT client_portal_invitations_email_check CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 320 AND position('@' IN email) > 1),
  CONSTRAINT client_portal_invitations_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT client_portal_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT client_portal_invitations_accepted_check CHECK ((accepted_at IS NULL) = (accepted_by_user_id IS NULL)),
  CONSTRAINT client_portal_invitations_final_state_check CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
CREATE UNIQUE INDEX client_portal_invitations_token_hash_unique ON public.client_portal_invitations USING btree (token_hash);
CREATE UNIQUE INDEX client_portal_invitations_pending_unique ON public.client_portal_invitations USING btree (client_id) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX client_portal_invitations_org_client_idx ON public.client_portal_invitations USING btree (organization_id, client_id, created_at);

-- Garde runtime : création par un professionnel de l'organisation, horodatage
-- et auteur imposés par le serveur ; seule la révocation est modifiable ;
-- jamais de suppression.
CREATE FUNCTION public.enforce_client_portal_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_user <> 'monservice_runtime' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Client portal invitations are never deleted' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by_user_id := public.current_app_user_id();
    NEW.created_at := now();
    NEW.expires_at := LEAST(GREATEST(NEW.expires_at, now() + interval '1 hour'), now() + interval '30 days');
    NEW.accepted_at := NULL;
    NEW.accepted_by_user_id := NULL;
    NEW.revoked_at := NULL;
    RETURN NEW;
  END IF;
  IF OLD.accepted_at IS NOT NULL OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL
     OR (to_jsonb(NEW) - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at') THEN
    RAISE EXCEPTION 'Only a pending invitation can be revoked' USING ERRCODE = '42501';
  END IF;
  NEW.revoked_at := now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.enforce_client_portal_invitation() FROM PUBLIC;
CREATE TRIGGER trg_client_portal_invitation
  BEFORE INSERT OR UPDATE OR DELETE ON public.client_portal_invitations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_client_portal_invitation();
CREATE TRIGGER runtime_immutable_fields BEFORE UPDATE ON public.client_portal_invitations
  FOR EACH ROW EXECUTE FUNCTION public.protect_runtime_fields();

ALTER TABLE public.client_portal_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public.client_portal_invitations AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "client_portal_invitations_professional_policy" ON public.client_portal_invitations AS PERMISSIVE FOR ALL TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id())
  WITH CHECK (current_profile_type() = 'professional' AND organization_id = current_organization_id());

REVOKE ALL ON public.client_portal_invitations FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.client_portal_invitations TO monservice_runtime;

-- Aperçu pour le titulaire du lien (compte client connecté) : nom du
-- prestataire et état, sans aucune autre donnée de la fiche.
CREATE FUNCTION public.preview_client_portal_invitation(p_token_hash text)
 RETURNS TABLE(organization_name text, state text, email_matches boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT o.name,
         CASE
           WHEN i.revoked_at IS NOT NULL THEN 'revoked'
           WHEN i.accepted_at IS NOT NULL THEN CASE WHEN i.accepted_by_user_id = public.current_app_user_id() THEN 'accepted' ELSE 'unavailable' END
           WHEN i.expires_at <= now() THEN 'expired'
           WHEN c.user_id IS NOT NULL AND c.user_id <> public.current_app_user_id() THEN 'unavailable'
           ELSE 'pending'
         END,
         lower(btrim(u.email)) = i.email
    FROM public.client_portal_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
    JOIN public.clients c ON c.id = i.client_id AND c.organization_id = i.organization_id
    JOIN public.users u ON u.id = public.current_app_user_id()
   WHERE i.token_hash = p_token_hash
     AND public.current_profile_type() = 'client'
     AND public.current_account_is_active();
$function$;
REVOKE ALL ON FUNCTION public.preview_client_portal_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_client_portal_invitation(text) TO monservice_runtime;

-- Acceptation : compte client actif, e-mail du compte = e-mail invité,
-- invitation en attente et non expirée, fiche libre (ou déjà reliée à ce
-- compte). Relie la fiche et clôt l'invitation dans la même transaction.
CREATE FUNCTION public.accept_client_portal_invitation(p_token_hash text)
 RETURNS TABLE(client_id text, organization_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id text := public.current_app_user_id();
  v_email text;
  inv public.client_portal_invitations;
  v_linked text;
BEGIN
  IF v_user_id IS NULL OR public.current_profile_type() IS DISTINCT FROM 'client' OR NOT public.current_account_is_active() THEN
    RAISE EXCEPTION 'A client account is required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inv FROM public.client_portal_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF inv.id IS NULL OR inv.revoked_at IS NOT NULL OR inv.accepted_at IS NOT NULL OR inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE = 'P0002';
  END IF;
  SELECT lower(btrim(email)) INTO v_email FROM public.users WHERE id = v_user_id;
  IF v_email IS DISTINCT FROM inv.email THEN
    RAISE EXCEPTION 'Invitation email mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT c.user_id INTO v_linked FROM public.clients c WHERE c.id = inv.client_id AND c.organization_id = inv.organization_id FOR UPDATE;
  IF v_linked IS NOT NULL AND v_linked <> v_user_id THEN
    RAISE EXCEPTION 'Client record already linked' USING ERRCODE = '42501';
  END IF;
  UPDATE public.clients c SET user_id = v_user_id, updated_at = now()::text
   WHERE c.id = inv.client_id AND c.organization_id = inv.organization_id;
  UPDATE public.client_portal_invitations SET accepted_at = now(), accepted_by_user_id = v_user_id WHERE id = inv.id;
  RETURN QUERY SELECT inv.client_id, inv.organization_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_client_portal_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_client_portal_invitation(text) TO monservice_runtime;

-- Retrait de l'accès par le professionnel : délie la fiche et révoque
-- l'invitation en attente éventuelle. L'historique des invitations reste.
CREATE FUNCTION public.unlink_client_portal_account(p_client_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text := public.current_organization_id();
BEGIN
  IF public.current_app_user_id() IS NULL OR public.current_profile_type() IS DISTINCT FROM 'professional' OR v_org IS NULL OR NOT public.current_account_is_active() THEN
    RAISE EXCEPTION 'A professional account is required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p_client_id AND c.organization_id = v_org) THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.client_portal_invitations i SET revoked_at = now()
   WHERE i.client_id = p_client_id AND i.organization_id = v_org AND i.accepted_at IS NULL AND i.revoked_at IS NULL;
  UPDATE public.clients c SET user_id = NULL, updated_at = now()::text
   WHERE c.id = p_client_id AND c.organization_id = v_org AND c.user_id IS NOT NULL;
  RETURN FOUND;
END;
$function$;
REVOKE ALL ON FUNCTION public.unlink_client_portal_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlink_client_portal_account(text) TO monservice_runtime;
