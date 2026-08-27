# SESSION 01C — CI / E2E BASELINE STABILIZATION

## Résumé exécutif
Cette session corrige les défaillances historiques des tests E2E sur le projet (timeouts persistants lors des navigations d'authentification et attentes de redirections RBAC obsolètes), permettant d'obtenir une baseline CI fiable avant d'aborder les développements de l'espace paramédical (Session 02).

## Commit de départ
fe02d6714fef487264ba78d5431432d2a85065f0

## Commit 01C
1d04dbab7d956d327b01a8801b4adc6c71fb36b3

## État CI avant 01C
Run #45 / 33061332589 (sur le commit 01C).
Avant la 01C, les runs CI échouaient tous au niveau des E2E en raison d'un timeout Playwright sur les étapes post-authentification. Les logs et rapports Playwright montraient un test figé.

## Échecs reproduits
- **Nom du test** : `CLIENT_E2E_01: Client A can access client dashboard and create a request` (dans `client-journey.spec.ts`)
- **Première erreur** : `page.waitForURL: Test timeout of 30000ms exceeded.`
- **URL attendue** : `**/client/dashboard`
- **URL réelle** : Reste sur le formulaire de login.
- **Comportement observé** : Le DOM reste bloqué sur la page de connexion, sans qu'aucun chargement de la nouvelle page ne s'amorce.
- **Cause retenue** : Race condition Next.js causée par l'enchaînement `router.push()` / `router.refresh()`.

- **Nom du test** : `RBAC_E2E_01: Un client est redirigé s'il tente d'accéder au dashboard pro` (dans `rbac.spec.ts`)
- **Première erreur** : `page.waitForURL: Test timeout of 30000ms exceeded.`
- **URL attendue** : `**/forbidden`
- **URL réelle** : L'utilisateur est redirigé vers `/client/dashboard`.
- **Comportement observé** : Le serveur renvoie le client vers son propre espace de travail, mais le test s'attend à une page `forbidden`.
- **Cause retenue** : Le contrat RBAC dans les tests E2E n'a pas été mis à jour pour refléter le comportement des Server Layouts introduits lors du correctif MS-008.

## Root cause 1 — navigation auth
Dans les fichiers `LoginForm.tsx` et `RegisterForm.tsx`, la séquence suivante était utilisée pour naviguer après l'authentification :
```typescript
router.push('/dashboard');
router.refresh();
```
La séquence introduisait ici une race observée dans le comportement E2E du projet. `router.refresh()` est censé rafraîchir la route courante, mais lorsqu'il est déclenché immédiatement après `router.push()`, il entre en compétition avec la transition SPA (Soft Navigation). Playwright observe alors un blocage complet de la navigation.
**Correction** : Suppression des appels à `router.refresh()`.

## Root cause 2 — contrat RBAC E2E obsolète
Le middleware ne redirige plus vers `/forbidden` depuis le correctif MS-008 afin d'éviter les boucles de redirections. Ce sont désormais les Server Layouts (`(dashboard)/layout.tsx` et `client/layout.tsx`) qui protègent les espaces en réorientant intelligemment l'utilisateur :
- un client qui tente `/dashboard` -> redirigé vers `/client/dashboard`
- un professionnel qui tente `/client/dashboard` -> redirigé vers `/dashboard`
**Correction** : Mise à jour des attentes URL dans `e2e/rbac.spec.ts` pour valider ces comportements (remplacement de `**/forbidden`).

## Modifications
- `src/components/auth/LoginForm.tsx` : Suppression de `router.refresh()`
- `src/components/auth/RegisterForm.tsx` : Suppression de `router.refresh()`
- `e2e/rbac.spec.ts` : Mise à jour des URLs de redirection attendues (`/client/dashboard` et `/dashboard` au lieu de `/forbidden`).
- `__tests__/unit/workspaces/resolver.test.ts` : (01C BIS) Correction de `as any` en itérant sur le tableau source `PARAMEDICAL_PROFESSION_CODES`.
- `docs/sessions/paramedical/SESSION_01B_FINALIZATION.md` : (01C BIS) Correction factuelle sur l'ancienne implémentation du Type Guard.
- `docs/sessions/paramedical/README.md` : (01C BIS) Ajout de 01C à l'index.
- `docs/sessions/paramedical/SESSION_01C_CI_E2E_BASELINE.md` : (01C BIS) Refonte de la documentation pour inclure l'audit 01C BIS.

## Validation locale
(À compléter après exécution).

## Validation CI
Run ID GitHub Actions : (À reporter).
Status : (À reporter).
Conclusion : (À reporter).

## DB / Supabase
Migration paramédicale : aucune
DB métier modifiée : non
Supabase distant modifié : non
New Query : non

## Dette restante
Aucune dette résiduelle connue sur la baseline CI (si la CI est complètement verte).

## Readiness Session 02
(À valider à la fin).
