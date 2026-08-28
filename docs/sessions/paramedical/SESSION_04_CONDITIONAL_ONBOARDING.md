# SESSION 04 — CONDITIONAL ONBOARDING

## 1. RÉSUMÉ EXÉCUTIF
La Session 04 a refactorisé l'infrastructure d'onboarding de MonSERVICE pour baser ses décisions de parcours sur le contexte métier réel de l'organisation (récupéré depuis le backend) plutôt que sur une propriété historique `user.sector` UX-only. Le parcours paramédical a été défini comme restrictif, ne guidant l'utilisateur que vers les modules existants.

## 2. HEAD INITIAL
`77909021828ef6256411ba8b1ebaa7e88cd52e0a`

## 3. AUDIT ONBOARDING EXISTANT
- **Problème `user.sector`** : La propriété `sector` sur `User` ne correspondait à aucune colonne en base `public.users` et était utilisée uniquement par le hook `useOnboarding`.
- **Source de vérité `organization`** : Le secteur et la profession vivent en base dans `public.organizations` et sont déjà chargés par le contexte global `AuthContext` via `organization`.
- **Architecture retenue** : Un nouveau contrat typé `OnboardingContext` a été introduit, passant le profil `client` ou `professional` avec `sector` et `profession`. 
- **`OnboardingContext`** : Créé dans `src/lib/onboarding/types.ts`.
- **Usage `resolveWorkspace`** : Le service `getOnboardingSteps` utilise désormais `resolveWorkspace()` pour déterminer le workspace effectif.
- **OnboardingProvider / OnboardingGuide** : Les doublons d'états d'onboarding ont été corrigés en forçant `OnboardingGuide` à consommer le `useOnboardingContext()`.
- **Tour scenarios** : Les actions `welcome` et `watch_tutorial` (optionnelles) ont été gérées sans forcer de faux scénarios non-existants. 

## 4. RÈGLES DE PARCOURS
- **Parcours client** : inchangé.
- **Parcours generic professional** : inchangé.
- **Parcours artisan** : Le bug de l'ID dupliqué (`5`) a été corrigé (`6`).
- **Parcours paramedical** : Adapté pour exclure le bouton `add_client` et aucun lien vers `/patients` n'a été inséré (pas de faux modules cliniques).
- **Health sans profession / Inconnue** : Utilise le plan paramedical fallback.
- **Professions officielles** : Utilisent le bon libellé (ex: "Configurez votre activité de Kinésithérapeute.").

## 5. DÉTAILS TECHNIQUES
- **`User.sector` supprimé** : Supprimé de l'interface `User` et de `profileUpdateSchema` car il n'est lié à aucune source de données réelle et causait une dé-synchronisation.
- **Onboarding UX-only** : Aucun impact sur RLS/GRANTS.
- **DB modifiée** : NON.
- **Migration créée** : NON.
- **Duplicate ID corrigé** : OUI.
- **IDs uniques testés** : OUI (tests unitaires robustes).
- **Required steps terminables** : OUI.

## 6. SÉCURITÉ ET TESTS
- tests unitaires onboarding créés (`__tests__/unit/onboarding/onboarding.service.test.ts`), 12/12 passent.
- register tests : 24/24 passent.
- Workspace tests : 20/20 passent.
- DB constraints : Vert.
- RLS : Vert.
- lint / typecheck / security / unit / compliance / build : Verts.

## 7. FICHIERS
- **Créés** : 
  - `src/lib/onboarding/types.ts`
  - `__tests__/unit/onboarding/onboarding.service.test.ts`
  - `docs/sessions/paramedical/SESSION_04_CONDITIONAL_ONBOARDING.md`
- **Modifiés** :
  - `src/lib/data/interfaces/user.interface.ts`
  - `src/lib/validation/schemas.ts`
  - `src/hooks/useOnboarding.ts`
  - `src/lib/services/onboarding.service.ts`
  - `src/components/onboarding/OnboardingGuide.tsx`

## 8. PRODUCTION ET DETTE
- **Supabase production** : Inchangée.
- **Dette restante** : La suite E2E complète reste non bloquante.
- **Git** : Clean.
- **CI** : *(Sera mis à jour avec le run ID)*

## 9. HANDOFF
La **Session 05** (Dynamic Navigation / Shell / Terminology) est prête à démarrer.
