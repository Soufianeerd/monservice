-- ===========================================================================
-- Migration 0002 — bascule vers Supabase Auth
--
-- PRÉREQUIS : la migration 0001 doit avoir été appliquée.
--
-- ⚠️ LIRE INTÉGRALEMENT AVANT D'EXÉCUTER. Cette migration touche à
-- `auth.users` et active la Row-Level Security : elle peut couper l'accès à
-- l'application si elle est appliquée partiellement.
--
-- ⚠️ FAIRE UNE SAUVEGARDE AVANT (Supabase → Database → Backups), et l'appliquer
-- d'abord sur un projet de préproduction.
--
-- Exécution :
--   psql "$DATABASE_URL" -f drizzle/postgres/0002_supabase_auth_migration.sql
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- ÉTAPE 0 — État des lieux (lecture seule, à exécuter d'abord et à conserver)
-- ---------------------------------------------------------------------------
-- Combien de comptes applicatifs, combien ont un mot de passe ?
--   SELECT count(*) AS total,
--          count(password) FILTER (WHERE password LIKE '$2%') AS avec_hash_bcrypt,
--          count(*) FILTER (WHERE password IS NULL) AS sans_mot_de_passe
--   FROM public.users;
--
-- Des comptes existent-ils déjà dans Supabase Auth ?
--   SELECT count(*) FROM auth.users;
--
-- État actuel de la RLS (anomalie MS-022) :
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';


-- ---------------------------------------------------------------------------
-- ÉTAPE 1 — Import des comptes existants dans Supabase Auth
-- ---------------------------------------------------------------------------
-- Les hachages existants sont au format bcrypt `$2b$10$…`, que Supabase Auth
-- accepte tel quel : les utilisateurs conservent leur mot de passe actuel.
--
-- L'identifiant est CONSERVÉ à l'identique. C'est essentiel : toutes les
-- données métier (organisations, clients, factures) référencent déjà ces
-- identifiants, et `getSessionContext()` relie `auth.users.id` à
-- `public.users.id`.

BEGIN;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_anonymous
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.id::uuid,
  'authenticated',
  'authenticated',
  lower(trim(u.email)),
  u.password,                     -- hachage bcrypt existant, repris tel quel
  now(),                          -- comptes historiques considérés comme confirmés
  coalesce(u.created_at::timestamptz, now()),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'profileType', u.profile_type),
  false,
  false
FROM public.users u
WHERE u.password IS NOT NULL
  AND u.password LIKE '$2%'                        -- uniquement les hachages bcrypt valides
  AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id::uuid)
ON CONFLICT (id) DO NOTHING;

-- Supabase exige une identité associée pour le provider « email ».
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  a.id::text,
  a.id,
  jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
FROM auth.users a
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = a.id AND i.provider = 'email'
);

COMMIT;

-- VÉRIFICATION — les deux comptes doivent correspondre :
--   SELECT (SELECT count(*) FROM auth.users) AS auth_users,
--          (SELECT count(*) FROM public.users WHERE password LIKE '$2%') AS profils_avec_hash;
--
-- Les comptes SANS mot de passe (par exemple `admin@monservice.com`) ne sont
-- PAS importés : ils ne pouvaient déjà pas se connecter. Pour leur donner un
-- accès, utiliser l'invitation depuis le tableau de bord Supabase.


-- ---------------------------------------------------------------------------
-- ÉTAPE 2 — La colonne `password` de public.users devient inutile
-- ---------------------------------------------------------------------------
-- Ne PAS la supprimer immédiatement : la conserver quelques semaines permet
-- de rejouer l'import en cas de problème. Une fois la bascule validée en
-- production, l'effacer — un hachage inutile reste une donnée sensible.
--
--   ALTER TABLE public.users DROP COLUMN password;   -- à faire PLUS TARD


-- ---------------------------------------------------------------------------
-- ÉTAPE 3 — Lien référentiel entre auth.users et public.users
-- ---------------------------------------------------------------------------

BEGIN;

-- Le type doit être uuid pour référencer auth.users.
ALTER TABLE public.users
  ALTER COLUMN id TYPE uuid USING id::uuid;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_auth_fk;

ALTER TABLE public.users
  ADD CONSTRAINT users_auth_fk
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMIT;

-- NOTE : si cette étape échoue, des lignes de `public.users` n'ont pas de
-- correspondance dans `auth.users` (comptes sans mot de passe). Les lister :
--   SELECT u.id, u.email FROM public.users u
--   LEFT JOIN auth.users a ON a.id = u.id
--   WHERE a.id IS NULL;
-- Puis les supprimer ou les importer avant de rejouer.


-- ---------------------------------------------------------------------------
-- ÉTAPE 4 — Filet de sécurité : profil créé automatiquement
-- ---------------------------------------------------------------------------
-- `registerAction` crée déjà le profil applicatif. Ce déclencheur couvre les
-- créations de compte faites en dehors de l'application (invitation depuis le
-- tableau de bord Supabase, connexion OAuth ultérieure) et évite un
-- utilisateur authentifié sans profil.

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
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data ->> 'profileType', 'client'),
    false, 0, 'free', 'inactive',
    now()::text, now()::text
  )
  ON CONFLICT (id) DO NOTHING;   -- l'application a peut-être déjà créé le profil

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ---------------------------------------------------------------------------
-- ÉTAPE 5 — ROW-LEVEL SECURITY (anomalies MS-005 et MS-022)
-- ---------------------------------------------------------------------------
-- C'EST L'INTÉRÊT PRINCIPAL DE LA BASCULE VERS SUPABASE AUTH.
--
-- La clé `publishable` est publique par conception : elle figure dans le
-- bundle JavaScript. Sans RLS, n'importe qui peut interroger l'API PostgREST
-- directement et lire toutes les tables, en contournant entièrement
-- l'application et ses contrôles.
--
-- L'application accède à la base via Drizzle avec le rôle propriétaire, qui
-- n'est PAS soumis à la RLS : activer ces politiques ne casse donc pas
-- l'application, mais ferme l'accès direct via l'API publique.
--
-- ⚠️ À TESTER EN PRÉPRODUCTION AVANT LA PRODUCTION.

-- Organisation de l'utilisateur courant, telle que vue par PostgREST.
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- 5.a — Tables portant une colonne `organization_id` : accès restreint à
--       l'organisation de l'utilisateur.
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

-- 5.b — Un utilisateur ne voit que son propre profil.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self_access ON public.users;
CREATE POLICY users_self_access ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR organization_id = public.current_organization_id());

-- Aucune politique d'écriture : les modifications passent exclusivement par
-- l'application, qui applique la liste blanche de champs (anomalie MS-004).

-- 5.c — Organisations : la sienne, ou celles publiées (profils publics).
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_read ON public.organizations;
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO authenticated, anon
  USING (is_public = true OR id = public.current_organization_id());

-- 5.d — Lignes de facture : rattachées via la facture parente.
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_lines_tenant_isolation ON public.invoice_lines;
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

-- 5.e — Messages : uniquement ceux dont on est émetteur ou destinataire
--       (anomalie MS-027).
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_participants_only ON public.messages;
CREATE POLICY messages_participants_only ON public.messages
  FOR ALL TO authenticated
  USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text)
  WITH CHECK (sender_id = auth.uid()::text);

-- 5.f — Demandes marketplace : les publiques, ou les siennes
--       (anomalie MS-026).
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS requests_visibility ON public.requests;
CREATE POLICY requests_visibility ON public.requests
  FOR SELECT TO authenticated
  USING (visibility = 'public' OR client_id = auth.uid()::text);

DROP POLICY IF EXISTS requests_owner_write ON public.requests;
CREATE POLICY requests_owner_write ON public.requests
  FOR ALL TO authenticated
  USING (client_id = auth.uid()::text)
  WITH CHECK (client_id = auth.uid()::text);

-- 5.g — Registre des événements Stripe : aucun accès public.
--       RLS activée sans politique = table fermée à l'API publique.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- VÉRIFICATION FINALE
-- ---------------------------------------------------------------------------
-- Toutes les tables doivent avoir `rowsecurity = true` :
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY rowsecurity, tablename;
--
-- Politiques en place :
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename;
--
-- TEST D'ÉTANCHÉITÉ (à faire depuis un navigateur, pas depuis psql) :
-- avec la clé publishable et SANS être connecté, appeler
--   GET https://<projet>.supabase.co/rest/v1/clients?select=*
--       &apikey=<publishable>
-- La réponse doit être un tableau VIDE. Si elle contient des données
-- clients, la RLS n'est pas effective : anomalie P0, arrêter immédiatement.


-- ---------------------------------------------------------------------------
-- CONFIGURATION À FAIRE DANS LE TABLEAU DE BORD SUPABASE (hors SQL)
-- ---------------------------------------------------------------------------
-- Authentication → Providers → Email
--   • « Confirm email » : ACTIVÉ en production (anomalie MS-035).
--     En développement, le désactiver évite d'avoir à configurer le SMTP.
--   • Longueur minimale du mot de passe : 12 (cohérent avec `registerSchema`).
--   • Protection contre les mots de passe compromis (HaveIBeenPwned) : activée.
--
-- Authentication → URL Configuration
--   • Site URL : l'URL de production.
--   • Redirect URLs : y ajouter http://localhost:3000/** pour le développement.
--
-- Authentication → Rate limits
--   • Conserver les limites par défaut : elles répondent en partie à
--     l'anomalie MS-017 (bourrage d'identifiants).
--
-- Authentication → Emails
--   • Le SMTP par défaut de Supabase est très limité et ne convient pas à la
--     production. Configurer un fournisseur réel — ce qui répond aussi à
--     l'anomalie MS-015 (aucun e-mail n'est envoyé aujourd'hui) et débloque la
--     réinitialisation de mot de passe (MS-016).
