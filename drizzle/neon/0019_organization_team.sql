-- Équipe d'une organisation : invitation de collaborateurs, rôle
-- administrateur, retrait d'un membre.
--
-- Jusqu'ici, un second compte ne pouvait rejoindre une organisation que par
-- une écriture en base : aucun parcours n'existait, alors que les plans
-- annoncent plusieurs utilisateurs et que les trois workspaces supposent des
-- équipes (praticiens, techniciens assignés, secrétariat).
--
-- Additif. Seule modification d'un objet existant : current_account_is_active()
-- tient désormais compte du retrait d'un membre, ce qui ferme d'un coup toutes
-- les politiques restrictives existantes à un collaborateur retiré.
-- users.organization_id reste immuable pour le rôle runtime : il ne change que
-- par les fonctions bornées ci-dessous. Un membre retiré garde son
-- rattachement (ses rapports, ordres de travail et rendez-vous y renvoient par
-- clé composite) mais perd tout accès.

-- 1. Rôle administrateur d'organisation.
INSERT INTO public.roles (id, name, description)
VALUES ('role-org-admin', 'org_admin', 'Administrateur de l''organisation : gère l''équipe et les invitations')
ON CONFLICT (name) DO NOTHING;


-- 2. Retrait d'un membre : trace conservée, aucun accès runtime direct.
CREATE TABLE public.organization_member_removals (
  user_id text PRIMARY KEY REFERENCES public.users(id),
  organization_id text NOT NULL REFERENCES public.organizations(id),
  removed_by_user_id text NOT NULL REFERENCES public.users(id),
  removed_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_member_removals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_member_removals FROM PUBLIC;

-- Un compte retiré de son organisation n'est plus actif : toutes les
-- politiques restrictives « account_active_required » le refusent.
CREATE OR REPLACE FUNCTION public.current_account_is_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = public.current_app_user_id()::text
      AND u.account_closed_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_member_removals m
        WHERE m.user_id = u.id AND m.organization_id = u.organization_id
      )
  );
$function$;


-- 3. Administrateurs. Le fondateur (professionnel actif inscrit en premier)
-- est administrateur tant qu'aucun administrateur n'est désigné
-- explicitement : aucune ligne n'est écrite à l'inscription. Dès la première
-- opération d'équipe, ses droits sont matérialisés dans user_roles.
CREATE FUNCTION public.organization_founder_id(p_organization_id text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT u.id FROM public.users u
   WHERE u.organization_id = p_organization_id
     AND u.profile_type = 'professional'
     AND u.account_closed_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.organization_member_removals m WHERE m.user_id = u.id AND m.organization_id = p_organization_id)
   ORDER BY u.created_at, u.id
   LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.organization_founder_id(text) FROM PUBLIC;

CREATE FUNCTION public.is_organization_admin(p_user_id text, p_organization_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id AND r.name = 'org_admin'
      WHERE ur.organization_id = p_organization_id
    ) THEN EXISTS (
      SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id AND r.name = 'org_admin'
      WHERE ur.organization_id = p_organization_id AND ur.user_id = p_user_id
    )
    ELSE public.organization_founder_id(p_organization_id) IS NOT DISTINCT FROM p_user_id AND p_user_id IS NOT NULL
  END;
$function$;
REVOKE ALL ON FUNCTION public.is_organization_admin(text, text) FROM PUBLIC;

CREATE FUNCTION public.materialize_organization_admin(p_organization_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_founder text;
BEGIN
  PERFORM 1 FROM public.organizations WHERE id = p_organization_id FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id AND r.name = 'org_admin'
    WHERE ur.organization_id = p_organization_id
  ) THEN
    RETURN;
  END IF;
  v_founder := public.organization_founder_id(p_organization_id);
  IF v_founder IS NOT NULL THEN
    INSERT INTO public.user_roles (id, user_id, role_id, organization_id)
    SELECT gen_random_uuid()::text, v_founder, r.id, p_organization_id FROM public.roles r WHERE r.name = 'org_admin';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.materialize_organization_admin(text) FROM PUBLIC;

CREATE FUNCTION public.current_user_is_organization_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT public.current_profile_type() = 'professional'
     AND public.current_account_is_active()
     AND public.current_organization_id() IS NOT NULL
     AND public.is_organization_admin(public.current_app_user_id()::text, public.current_organization_id());
$function$;
REVOKE ALL ON FUNCTION public.current_user_is_organization_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_organization_admin() TO monservice_runtime;

-- 4. Invitations. Le jeton n'est jamais stocké : seule son empreinte SHA-256.
CREATE TABLE public.organization_invitations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token_hash text NOT NULL,
  created_by_user_id text NOT NULL REFERENCES public.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  accepted_by_user_id text REFERENCES public.users(id),
  revoked_at timestamp with time zone,
  CONSTRAINT organization_invitations_role_check CHECK (role IN ('admin', 'member')),
  CONSTRAINT organization_invitations_email_check CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 320 AND position('@' IN email) > 1),
  CONSTRAINT organization_invitations_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT organization_invitations_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT organization_invitations_accepted_check CHECK ((accepted_at IS NULL) = (accepted_by_user_id IS NULL)),
  CONSTRAINT organization_invitations_final_state_check CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
CREATE UNIQUE INDEX organization_invitations_token_hash_unique ON public.organization_invitations USING btree (token_hash);
CREATE UNIQUE INDEX organization_invitations_pending_unique ON public.organization_invitations USING btree (organization_id, email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX organization_invitations_email_idx ON public.organization_invitations USING btree (email, created_at);

-- Garde runtime : auteur et horodatage imposés, seule la révocation est
-- modifiable, jamais de suppression.
CREATE FUNCTION public.enforce_organization_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_user <> 'monservice_runtime' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Organization invitations are never deleted' USING ERRCODE = '42501';
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
REVOKE ALL ON FUNCTION public.enforce_organization_invitation() FROM PUBLIC;
CREATE TRIGGER trg_organization_invitation
  BEFORE INSERT OR UPDATE OR DELETE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_invitation();
CREATE TRIGGER runtime_immutable_fields BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.protect_runtime_fields();

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public.organization_invitations AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "organization_invitations_admin_policy" ON public.organization_invitations AS PERMISSIVE FOR ALL TO monservice_runtime
  USING (current_user_is_organization_admin() AND organization_id = current_organization_id())
  WITH CHECK (current_user_is_organization_admin() AND organization_id = current_organization_id());
REVOKE ALL ON public.organization_invitations FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.organization_invitations TO monservice_runtime;

-- 5. Aperçu pour le titulaire du lien, avec ou sans session : le jeton est le
-- secret. Nom de l'organisation, adresse invitée, rôle et état seulement.
CREATE FUNCTION public.preview_organization_invitation(p_token_hash text)
 RETURNS TABLE(organization_name text, email text, role text, state text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT o.name, i.email, i.role,
         CASE
           WHEN i.revoked_at IS NOT NULL THEN 'revoked'
           WHEN i.accepted_at IS NOT NULL THEN 'accepted'
           WHEN i.expires_at <= now() THEN 'expired'
           ELSE 'pending'
         END,
         i.expires_at
    FROM public.organization_invitations i
    JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.token_hash = p_token_hash;
$function$;
REVOKE ALL ON FUNCTION public.preview_organization_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_organization_invitation(text) TO monservice_runtime;

-- Invitation en attente adressée au compte connecté (par son adresse).
CREATE FUNCTION public.current_pending_organization_invitation()
 RETURNS TABLE(organization_name text, role text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT o.name, i.role, i.expires_at
    FROM public.users u
    JOIN public.organization_invitations i
      ON i.email = lower(btrim(u.email)) AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    JOIN public.organizations o ON o.id = i.organization_id
   WHERE u.id = public.current_app_user_id()::text
     AND u.profile_type = 'professional'
     AND u.account_closed_at IS NULL
   ORDER BY i.created_at DESC
   LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.current_pending_organization_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_pending_organization_invitation() TO monservice_runtime;

-- Organisation dont le compte connecté a été retiré, pour l'en informer.
CREATE FUNCTION public.current_organization_removal()
 RETURNS TABLE(organization_name text, removed_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT o.name, m.removed_at
    FROM public.users u
    JOIN public.organization_member_removals m ON m.user_id = u.id AND m.organization_id = u.organization_id
    JOIN public.organizations o ON o.id = m.organization_id
   WHERE u.id = public.current_app_user_id()::text AND u.account_closed_at IS NULL;
$function$;
REVOKE ALL ON FUNCTION public.current_organization_removal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_organization_removal() TO monservice_runtime;

-- 6. Acceptation : compte professionnel à l'adresse vérifiée égale à
-- l'adresse invitée, sans organisation (ou retiré de celle qui l'invite à
-- nouveau). Jeton facultatif : sans jeton, la plus récente invitation en
-- attente pour l'adresse du compte.
CREATE FUNCTION public.accept_organization_invitation(p_token_hash text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  actor public.users;
  inv public.organization_invitations;
  v_provider text := nullif(current_setting('monservice.provider_user_id', true), '');
  v_verified boolean;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = public.current_app_user_id()::text FOR UPDATE;
  IF actor.id IS NULL OR actor.profile_type IS DISTINCT FROM 'professional' OR actor.account_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'A professional account is required' USING ERRCODE = '42501';
  END IF;
  SELECT "emailVerified" INTO v_verified FROM neon_auth."user" WHERE id::text = v_provider;
  IF v_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Verified email required' USING ERRCODE = '42501';
  END IF;
  IF p_token_hash IS NULL THEN
    SELECT * INTO inv FROM public.organization_invitations
     WHERE email = lower(btrim(actor.email)) AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  ELSE
    SELECT * INTO inv FROM public.organization_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  END IF;
  IF inv.id IS NULL OR inv.revoked_at IS NOT NULL OR inv.accepted_at IS NOT NULL OR inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE = 'P0002';
  END IF;
  IF inv.email IS DISTINCT FROM lower(btrim(actor.email)) THEN
    RAISE EXCEPTION 'Invitation email mismatch' USING ERRCODE = '42501';
  END IF;
  PERFORM public.materialize_organization_admin(inv.organization_id);
  IF actor.organization_id IS NULL THEN
    UPDATE public.users SET organization_id = inv.organization_id, updated_at = now()::text WHERE id = actor.id;
  ELSIF actor.organization_id = inv.organization_id
        AND EXISTS (SELECT 1 FROM public.organization_member_removals m WHERE m.user_id = actor.id AND m.organization_id = inv.organization_id) THEN
    DELETE FROM public.organization_member_removals WHERE user_id = actor.id;
  ELSE
    RAISE EXCEPTION 'Account already belongs to an organization' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.user_roles ur USING public.roles r
   WHERE r.id = ur.role_id AND r.name = 'org_admin' AND ur.user_id = actor.id AND ur.organization_id = inv.organization_id;
  IF inv.role = 'admin' THEN
    INSERT INTO public.user_roles (id, user_id, role_id, organization_id)
    SELECT gen_random_uuid()::text, actor.id, r.id, inv.organization_id FROM public.roles r WHERE r.name = 'org_admin';
  END IF;
  UPDATE public.organization_invitations SET accepted_at = now(), accepted_by_user_id = actor.id WHERE id = inv.id;
  RETURN inv.organization_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text) TO monservice_runtime;

-- 7. Membres de l'organisation courante (actifs uniquement).
CREATE FUNCTION public.list_organization_members()
 RETURNS TABLE(user_id text, name text, email text, role text, joined_at text, is_current boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT u.id, u.name, u.email,
         CASE WHEN public.is_organization_admin(u.id, u.organization_id) THEN 'admin' ELSE 'member' END,
         u.created_at,
         u.id = public.current_app_user_id()::text
    FROM public.users u
   WHERE public.current_profile_type() = 'professional'
     AND public.current_account_is_active()
     AND u.organization_id = public.current_organization_id()
     AND u.profile_type = 'professional'
     AND u.account_closed_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.organization_member_removals m WHERE m.user_id = u.id AND m.organization_id = u.organization_id)
   ORDER BY u.created_at, u.id;
$function$;
REVOKE ALL ON FUNCTION public.list_organization_members() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_organization_members() TO monservice_runtime;

-- 8. Changement de rôle : par un administrateur, jamais au point de laisser
-- l'organisation sans administrateur.
CREATE FUNCTION public.set_organization_member_role(p_user_id text, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text := public.current_organization_id();
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role' USING ERRCODE = '22023';
  END IF;
  PERFORM public.materialize_organization_admin(v_org);
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_user_id AND u.organization_id = v_org AND u.profile_type = 'professional' AND u.account_closed_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.organization_member_removals m WHERE m.user_id = u.id AND m.organization_id = v_org)
  ) THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_role = 'admin' THEN
    IF NOT public.is_organization_admin(p_user_id, v_org) THEN
      INSERT INTO public.user_roles (id, user_id, role_id, organization_id)
      SELECT gen_random_uuid()::text, p_user_id, r.id, v_org FROM public.roles r WHERE r.name = 'org_admin';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id AND r.name = 'org_admin'
      JOIN public.users u ON u.id = ur.user_id AND u.organization_id = v_org AND u.account_closed_at IS NULL
      WHERE ur.organization_id = v_org AND ur.user_id <> p_user_id
        AND NOT EXISTS (SELECT 1 FROM public.organization_member_removals m WHERE m.user_id = u.id AND m.organization_id = v_org)
    ) THEN
      RAISE EXCEPTION 'Last organization administrator' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.user_roles ur USING public.roles r
     WHERE r.id = ur.role_id AND r.name = 'org_admin' AND ur.user_id = p_user_id AND ur.organization_id = v_org;
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_organization_member_role(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_organization_member_role(text, text) TO monservice_runtime;

-- 9. Retrait d'un membre par un administrateur (jamais soi-même). Le compte
-- garde son rattachement historique mais n'a plus aucun accès.
CREATE FUNCTION public.remove_organization_member(p_user_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text := public.current_organization_id();
  v_actor text := public.current_app_user_id()::text;
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Administrators cannot remove themselves' USING ERRCODE = '42501';
  END IF;
  PERFORM public.materialize_organization_admin(v_org);
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_user_id AND u.organization_id = v_org AND u.profile_type = 'professional' AND u.account_closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.organization_member_removals (user_id, organization_id, removed_by_user_id, removed_at)
  VALUES (p_user_id, v_org, v_actor, now())
  ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, removed_by_user_id = EXCLUDED.removed_by_user_id, removed_at = EXCLUDED.removed_at;
  DELETE FROM public.user_roles WHERE user_id = p_user_id AND organization_id = v_org;
END;
$function$;
REVOKE ALL ON FUNCTION public.remove_organization_member(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(text) TO monservice_runtime;

-- 10. Espace personnel pour un professionnel sans organisation (invitation
-- retirée, ou inscrit sur invitation qui préfère créer le sien).
CREATE FUNCTION public.create_current_workspace(p_name text, p_sector text, p_profession text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  actor public.users;
  new_org text;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = public.current_app_user_id()::text FOR UPDATE;
  IF actor.id IS NULL OR actor.profile_type IS DISTINCT FROM 'professional' OR actor.account_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'A professional account is required' USING ERRCODE = '42501';
  END IF;
  IF actor.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Account already belongs to an organization' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(p_name), '') IS NULL OR length(p_name) > 200 OR p_sector NOT IN ('health', 'field_services', 'freelance', 'other') THEN
    RAISE EXCEPTION 'Invalid workspace' USING ERRCODE = '22023';
  END IF;
  new_org := gen_random_uuid()::text;
  INSERT INTO public.organizations (id, name, industry, sector, profession, profile_type, is_public, country, created_at, updated_at)
  VALUES (new_org, btrim(p_name), p_sector, p_sector, p_profession, 'professional', false, 'France', now()::text, now()::text);
  UPDATE public.users SET organization_id = new_org, updated_at = now()::text WHERE id = actor.id;
  RETURN new_org;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_current_workspace(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_current_workspace(text, text, text) TO monservice_runtime;
