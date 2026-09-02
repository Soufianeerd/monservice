# Session 07C: Practice Structure Authorization Finalization

## Objectifs de la session 07C
Fermer définitivement la faille d'autorisation au niveau RLS PostgreSQL pour empêcher tout contournement par un profil `client` du même tenant accédant directement à Supabase/PostgREST, verrouiller les contrats stricts de policies, de clés étrangères composites et d'index critiques en CI, et compléter les suites de tests unitaires et de navigation.

## Traçabilité Git & CI 07C
- **HEAD de départ 07C** : `56d8dc1ae32bdb4c3e279d9e637c9dfde35319d9`
- **Commits 07C** :
  - `f48ace9e2cceac9a6f13cf241b5c9a115a7cb656` : `fix(practice): enforce professional-only structure access`
  - `536a5329d46c7db02e17c7eb3f831a2265c73ca2` : `fix(rls): align expected fixture names in client update tests with seed data`
- **HEAD final validé 07C** : `536a5329d46c7db02e17c7eb3f831a2265c73ca2`
- **Run GitHub Actions validé 07C** : `33651430003` (status: `completed`, conclusion: `success`)

## 1. Contexte & Cause Racine (Root Cause)
- `public.current_organization_id()` retourne l'organisation de `auth.uid()` mais ne filtre pas le `profile_type`.
- Dans le seed E2E, `client_a@monservice.com` est un utilisateur authentifié rattaché à Org A (`profile_type = 'client'`).
- Bien que les Server Actions Next.js utilisent `requireProfessional()`, un client connecté pouvait forger des requêtes directes à PostgREST avec son JWT et satisfaire la clause `organization_id = public.current_organization_id()`.
- La base de données PostgreSQL est désormais la barrière de défense hermétique avec vérification explicite du `profile_type = 'professional'` dans toutes les RLS.

## 2. Durcissement des Politiques RLS (PostgreSQL)
Modification canonique dans `drizzle/postgres/0012_practice_structure_foundation.sql` (sans création de `0013`) :
Toutes les 5 tables de structure (`practice_locations`, `practice_practitioners`, `practitioner_locations`, `practice_rooms`, `practice_resources`) exigent désormais :
- **USING** :
  ```sql
  organization_id = public.current_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.users caller
    WHERE caller.id = auth.uid()::text
      AND caller.organization_id = public.current_organization_id()
      AND caller.profile_type = 'professional'
  )
  ```
- **WITH CHECK** :
  Exige la même condition d'appelant professionnel, et pour `practice_practitioners`, vérifie en surplus que si `user_id` est non-null, l'utilisateur lié appartient au même tenant et est de `profile_type = 'professional'`.

## 3. Extension des Tests RLS Réels
Dans `__tests__/integration/practice-structure-rls.integration.test.ts` :
1. **Accès positif Pro B complet** : validation SELECT sur les 5 tables (`locationB`, `practitionerB`, `assignmentB`, `roomB`, `resourceB`).
2. **Rejet de lecture Client A** : SELECT sur les 5 fixtures Org A retourne `error: null` et `data: []` (lignes masquées par RLS).
3. **Rejet d'écriture Client A** : UPDATE sur les 5 fixtures Org A retourne `0` lignes affectées, et Pro A vérifie l'intégrité des données d'origine (`Cabinet Principal Paris`, `Dr. Jane Doe`, `Salle 1 - Rééducation`, `Table de rééducation électrique`).
4. **Rejet d'insertion Client A** :
   - INSERT dans `practice_locations` (Org A) rejeté avec code SQLSTATE `42501`.
   - INSERT dans `practice_practitioners` (Org A, `user_id = NULL`) rejeté avec code SQLSTATE `42501`.

## 4. Contrats CI Automatisés

### Script `scripts/check-custom-objects.ts`
- Remplacement des types `Record<string, any>` par `ExpectedFunctionContract`.
- Contrat exact sur les 5 policies (`practice_locations_tenant_isolation`, `practice_practitioners_tenant_isolation`, `practitioner_locations_tenant_isolation`, `practice_rooms_tenant_isolation`, `practice_resources_tenant_isolation`) vérifiant : `tablename`, `policyname`, `roles` incluant `authenticated`, `cmd = 'ALL'`, `qual` et `with_check`.
- Vérification sémantique normalisée de la présence de `current_organization_id`, `auth.uid`, `profile_type`, `professional` dans `qual` et `with_check`, ainsi que `user_id` pour les praticiens.

### Script `scripts/check-schema-contract.ts`
- Verrouillage nominatif des 6 clés étrangères composites :
  - `practice_practitioners_user_fk` : `(user_id, organization_id) -> users(id, organization_id)`
  - `practitioner_locations_practitioner_fk` : `(practitioner_id, organization_id) -> practice_practitioners(id, organization_id)`
  - `practitioner_locations_location_fk` : `(location_id, organization_id) -> practice_locations(id, organization_id)`
  - `practice_rooms_location_fk` : `(location_id, organization_id) -> practice_locations(id, organization_id)`
  - `practice_resources_location_fk` : `(location_id, organization_id) -> practice_locations(id, organization_id)`
  - `practice_resources_room_fk` : `(room_id, location_id, organization_id) -> practice_rooms(id, location_id, organization_id)`
- Verrouillage nominatif des 8 index critiques (`users_id_org_unique`, `practice_locations_org_id_unique`, `practice_locations_primary_active_idx`, `practice_practitioners_org_id_unique`, `practice_practitioners_org_user_unique`, `practice_rooms_org_location_id_unique`, `practitioner_locations_assignment_unique`, `practitioner_locations_primary_active_idx`).

## 5. Tests Unitaires & Gardes Runtime
- `tests/unit/practice-structure/parametres-layout.test.tsx` : tests du layout Paramètres (onglet Cabinet présent uniquement pour le paramédical, `notFound()` si organisation manquante).
- `src/app/(dashboard)/parametres/layout.tsx` : déclenche `notFound()` si l'organisation n'existe pas.
- `tests/unit/practice-structure/cabinet-page.test.tsx` : test d'organisation manquante appelant `notFound()`.
- `tests/unit/practice-structure/actions.test.ts` : tests de rejet si organisation introuvable ou générique.
- `tests/unit/practice-structure/validation.test.ts` : suppression de tout cast `as unknown as`, tests timezone exhaustifs (`Europe/Paris`, `Europe/Luxembourg`, rejet de `Europe/Nancy` et `Paris`).
- `__tests__/unit/workspaces/workspace-navigation.test.ts` : vérification que `/parametres/cabinet` est présent uniquement dans les paramètres paramédicaux.

## 6. Périmètre Préservé
- Aucune entité clinique créée (`patient_profiles`, `patients`, `appointments`, `clinical_notes`, etc.).
- Aucune migration `0013` créée.
- Supabase production inchangée.
- Zéro `any` / `as any` dans tout le périmètre de la structure du cabinet.

## Readiness Session 08
OUI. L'ensemble des politiques RLS avec contrôle de profil appelant, contrats de schéma et de policies, tests unitaires et intégration CI/CD sont validés avec succès.
