# Session 07: Practice Structure Foundation

## Objectifs de la session
Implémenter la structure physique et organisationnelle d'un cabinet paramédical pour préparer les fonctionnalités avancées d'agenda et de gestion des ressources.

## Travail accompli

### 1. Base de données
- Création de la migration `0012` introduisant :
  - `practice_locations`
  - `practice_practitioners`
  - `practitioner_locations`
  - `practice_rooms`
  - `practice_resources`
- Définition stricte des contraintes : 
  - Foreign keys composites incluant `organization_id` pour la sécurité tenant.
  - Contraintes d'unicité partielle (un seul lieu principal actif).
  - Validation sur les professions autorisées pour les paramédicaux.
- Sécurisation via `ENABLE ROW LEVEL SECURITY` et `GRANT SELECT, INSERT, UPDATE` (pas de `DELETE`).
- Isolation inter-tenant avec `current_organization_id()`.

### 2. Validation et Types
- Création de `src/lib/practice-structure/types.ts` et `validation.ts`.
- Validation Zod des DTOs incluant la validation IANA des fuseaux horaires.

### 3. Logique Serveur
- Création de `practice-structure.service.ts` pour gérer le CRUD des entités de structure de façon scope-sécurisée.
- Création de `practice-structure.actions.ts` utilisant `requireProfessional()` de session.

### 4. Interface Utilisateur
- Intégration de l'onglet `Cabinet` dans `src/lib/navigation/workspace-navigation.ts` et du layout de paramètres.
- L'onglet `Cabinet` n'est visible que pour les espaces de travail de type `paramedical`.
- UI de base (`PracticeStructureManager`) pour lister les entités.

### 5. Tests et CI
- Ajout des 5 nouvelles tables dans `scripts/check-custom-objects.ts`.
- Ajout du check de contrainte de profession dans `scripts/check-schema-contract.ts`.
- Ajout d'un seed E2E de la structure `Practice` dans `scripts/e2e/seed-local.ts`.
- Création de tests d'intégration stricts (isolation RLS et DB constraints).
- Création de tests unitaires (validation Zod).
- Ajout de `test:practice-structure` dans `package.json` et GitHub Actions.

## Readiness Session 08
NON (voir Session 07B). La finalisation des contrats d'ordonnancement de migration, RLS avec auth Supabase réelle, tests unitaires dédiés et typage strict est réalisée en Session 07B.

