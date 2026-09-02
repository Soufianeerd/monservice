# Session 07B: Practice Structure Contract Finalization

## Objectifs de la session 07B
Finaliser et sécuriser l'ensemble des contrats, contraintes de base de données, RLS avec authentification réelle Supabase, typage strict sans cast `any`, et intégration CI/CD pour la structure du cabinet paramédical.

## Traçabilité Git & CI 07B
- **HEAD de départ 07B** : `94b598f6bbddd9d211836940d1516ecbfd8755a0`
- **Commits 07B** :
  - `d19f444b226c3eeec80c7b1ef8c9bc88ca0e5b11` : `fix(practice): finalize practice structure contracts, rls, and unit tests`
  - `349ebb1cf4fa3349bff63b5f78467adf9ec00d18` : `fix(db): add created_at and updated_at to organization fixtures in db-constraints test`
  - `56d8dc1ae32bdb4c3e279d9e637c9dfde35319d9` : `fix(rls): use snake_case column names and guard seed script in tests`
- **Run GitHub Actions validé 07B** : `33644052725` (status: `completed`, conclusion: `success`)

## Synthèse des corrections apportées

### 1. Migration PostgreSQL & Ordre des Déclarations
- Réordonnancement strict de la migration canonique unique `drizzle/postgres/0012_practice_structure_foundation.sql`.
- Tous les index uniques requis par les contraintes composites (`users_id_org_unique`, `practice_locations_org_id_unique`, `practice_rooms_org_location_id_unique`, `practice_practitioners_org_id_unique`) sont désormais créés **avant** les instructions `ADD CONSTRAINT ... FOREIGN KEY`.
- Révocation explicite des privilèges (`REVOKE ALL PRIVILEGES ON TABLE ... FROM PUBLIC, anon, authenticated;`) suivie de grants minimaux et stricts (`GRANT SELECT, INSERT, UPDATE ON TABLE ... TO authenticated;`, sans `DELETE` public/authenticated).

### 2. Runtime Workspace & Résolution Serveur
- Résolution propre du workspace paramédical dans `ParametresLayout` (`src/app/(dashboard)/parametres/layout.tsx`), `CabinetPage` (`src/app/(dashboard)/parametres/cabinet/page.tsx`), et les server actions (`src/app/actions/practice-structure.actions.ts`).
- Les composants et actions interrogent l'organisation réelle via `organizationService.getById(organizationId)` pour récupérer les propriétés métier (`sector`, `profession`, `country`) et vérifient la validité du workspace (`workspace.type === 'paramedical'`) avec rejet immédiat ou `notFound()` si non-paramédical.
- Aucune fabrication d'organisation factice ni cast `as any`.

### 3. Service Layer & Sécurité Multi-Tenant
- Réécriture intégrale de `practiceStructureService` (`src/lib/services/practice-structure.service.ts`) avec zéro `any` / `as any`.
- Projections SELECT explicites sur toutes les requêtes (omettant les colonnes internes de tracking dans les DTOs exposés).
- Vérifications défensives multi-tenant à la création/mise à jour (vérification de l'appartenance de la localisation, de la salle, et du praticien au tenant demandeur).
- Contrôle d'activation : impossible d'assigner ou de créer une salle/ressource sur une localisation désactivée (`is_active = false`).
- Règle de suppression douce (soft-disable via `isActive` uniquement, aucune commande `DELETE` en base).

### 4. Validation & Types
- `src/lib/practice-structure/validation.ts` :
  - Utilise directement `PARAMEDICAL_PROFESSION_CODES` depuis `src/lib/workspaces/paramedical/professions.ts`.
  - Validation des fuseaux horaires IANA via `Intl.DateTimeFormat`.
  - Invariant d'affectation : maximum un seul lieu principal (`isPrimary: true`) par praticien.
- `src/lib/practice-structure/types.ts` :
  - DTOs strictement typés (`PracticeLocationDTO`, `PracticePractitionerDTO`, `PracticeRoomDTO`, `PracticeResourceDTO`, `PractitionerLocationAssignmentDTO`).
  - Ajout de `LinkedProfessionalUser` et `eligibleUsers` dans `PracticeStructureOverview`.

### 5. Interface Utilisateur
- `src/components/practice/PracticeStructureManager.tsx` :
  - Gestion par onglets typés (`locations`, `practitioners`, `rooms`, `resources`).
  - Affichage des libellés de profession humanisés via `getParamedicalProfession(code)`.
  - Formulaires complets pour la création, la modification, l'affectation des lieux et le basculement d'activation (`Activer` / `Désactiver`).

### 6. Tests & Suites d'Intégration
- **Seed déterministe** (`scripts/e2e/seed-local.ts`) :
  - Fixtures multi-tenant avec UUIDs constants pour Org A et Org B (lieux, praticiens, affectations, salles, ressources).
  - Préservation des secteurs historiques (`IT`, `Consulting`) des organisations E2E.
- **Tests RLS réels** (`__tests__/integration/practice-structure-rls.integration.test.ts`) :
  - Utilisation de `@supabase/supabase-js` avec tokens d'authentification réels (`anonClient`, `proAClient`, `proBClient`, `cliAClient`).
  - Validation de l'erreur `42501` pour anon sur les 5 tables.
  - Isolation inter-tenant hermétique en SELECT, INSERT, UPDATE, et rejet du linking croisé ou linking client.
- **Tests de contraintes DB** (`__tests__/integration/db-constraints.integration.test.ts`) :
  - Vérification des codes SQLSTATE réels (`23514` check violation, `23505` unique violation, `23503` FK composite violation).
- **Tests unitaires Practice Structure** (`tests/unit/practice-structure/`) :
  - `validation.test.ts`
  - `actions.test.ts`
  - `cabinet-page.test.tsx`
  - `ui.test.tsx`

## Audit post-07B & Motivation de la Session 07C
L'audit post-07B a identifié que si les Server Actions appliquent bien `requireProfessional()`, les RLS PostgreSQL de `0012` vérifiaient uniquement `organization_id = public.current_organization_id()`. Un utilisateur de type `profile_type = 'client'` rattaché au même tenant pouvait donc contourner l'API et interroger directement Supabase/PostgREST. La Session 07C est mandatée pour durcir les RLS au niveau base de données avec `EXISTS(SELECT 1 FROM public.users caller WHERE ... AND profile_type = 'professional')` et ajouter les contrats exacts de vérification CI.

## Readiness Session 08
NON (voir Session 07C).
