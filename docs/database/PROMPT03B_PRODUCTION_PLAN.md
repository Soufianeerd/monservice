# Plan de Migration Production (Prompt 03B)

## Objectif
Préparer la base de données de production à recevoir la réconciliation (0009) sans interrompre le service ni écraser les données existantes.

## État des Lieux
- La production est actuellement à la migration `0008`.
- L'ancienne migration `0009` n'a JAMAIS été validée en production grâce au blocage de la CI.
- L'identifiant `public.users.id` est de type `text` sur `schema.ts`. Supabase utilise des UUID pour `auth.users`. Le lien entre les deux s'effectue via un `cast` au niveau des triggers, sans contraindre `public.users` à devenir un UUID (ce qui nécessiterait une migration complexe des clés étrangères historiques).

## Stratégie de Migration (Zero-Downtime)

### Étape 1 : Sauvegarde (Pre-Flight)
1. Créer un Point In Time Recovery (PITR) manuel via le tableau de bord Supabase.
2. S'assurer qu'aucun changement manuel de schéma n'a été effectué sur la production.

### Étape 2 : Déploiement de la Migration 0009
Le GitHub Actions exécutera la nouvelle migration `0009_medical_power_man.sql` regénérée par Drizzle.
Cette migration effectuera :
1. Les changements de types (`numeric(14,2)`) de manière rétro-compatible.
2. La suppression des colonnes mortes (`mfa_secret`, `mfa_enabled`).
3. L'installation des politiques **Row Level Security (RLS)**.
4. L'installation du trigger `on_auth_user_created`.

*Aucune transaction implicite `BEGIN; COMMIT;` globale n'est présente, garantissant l'absence de l'erreur `25001: already a transaction in progress`.*

### Étape 3 : Migration des Données Utilisateurs (Post-Flight Script)
L'importation des utilisateurs de `public.users` vers `auth.users` ne fait **pas** partie de la migration Drizzle afin d'éviter le couplage Schéma/Data.

Il faut exécuter un script SQL ponctuel sur la production **APRÈS** la validation du déploiement :
```sql
BEGIN;
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.id::uuid, 'authenticated', 'authenticated', lower(trim(u.email)),
  u.password, now(), coalesce(u.created_at::timestamptz, now()), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'profileType', u.profile_type)
FROM public.users u
WHERE u.password IS NOT NULL AND u.password LIKE '$2%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT a.id::text, a.id, jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true), 'email', now(), now(), now()
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = a.id AND i.provider = 'email');
COMMIT;
```

### Étape 4 : Validation et Sécurisation
- Une fois les utilisateurs importés, basculer le routage d'authentification sur le SDK Supabase.
- Configurer les redirect URLs dans le dashboard de Supabase (Production).
- Optionnel : Procéder plus tard à la suppression de la colonne `password` sur `public.users` avec une nouvelle PR.
