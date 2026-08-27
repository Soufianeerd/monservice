# SESSION 01C — CI / E2E BASELINE STABILIZATION

## Objectif
Stabiliser la baseline E2E globale du projet (qui était cassée avant même le début des travaux sur l'espace paramédical) pour s'assurer que la CI passe avec succès. Cette étape est cruciale avant d'attaquer la Session 02 (Persistance DB / Onboarding).

## Analyse et Résolution

Les tests E2E, notamment `rbac.spec.ts` et `client-journey.spec.ts`, subissaient tous des timeouts (30s) systématiques au moment de la vérification de la redirection post-login (`await page.waitForURL(...)`).

Deux root causes indépendantes mais cumulatives ont été identifiées et corrigées :

### 1. Annulation de la transition Next.js App Router (SPA Navigation)
**Problème** : Dans `LoginForm.tsx` et `RegisterForm.tsx`, le code effectuait :
```typescript
router.push('/dashboard');
router.refresh();
```
**Analyse** : Dans Next.js (App Router), l'appel de `router.refresh()` immédiatement après un `router.push()` introduit une condition de course (race condition). Dans un environnement Headless (CI Playwright), `router.refresh()` annule l'exécution de la transition initiée par `router.push()`. En conséquence, l'URL de la page n'est jamais mise à jour sur le navigateur, figeant le test sur la page de connexion (`/login`) jusqu'au timeout.
**Correctif** : Suppression des appels obsolètes et conflictuels à `router.refresh()` après les navigations d'authentification réussies. Next.js App Router met correctement à jour la route et le cache lors d'un `router.push()`.

### 2. Tests E2E obsolètes face aux layouts serveurs (MS-008)
**Problème** : `rbac.spec.ts` attendait une redirection vers `**/forbidden` lors des tests d'accès croisés (Client vers `/dashboard`, et Pro vers `/client/dashboard`).
**Analyse** : La gestion des routes sécurisées (MS-008) a été refactorisée antérieurement. Le `middleware.ts` ne redirige plus vers `/forbidden` pour des questions de rôles applicatifs, afin d'éviter les boucles de redirection (Redirect Loops). La protection est aujourd'hui assurée par les Layouts (`(dashboard)/layout.tsx` et `client/layout.tsx`), qui réorientent intelligemment et sans boucle l'utilisateur vers *son propre* espace (un Pro vers `/dashboard`, un Client vers `/client/dashboard`). Les tests E2E, eux, n'avaient jamais été mis à jour pour refléter ce comportement attendu.
**Correctif** : Mise à jour de `e2e/rbac.spec.ts` pour affirmer les bonnes destinations de redirection post-garde (ex: un pro atterrissant sur `/client/dashboard` est désormais redirigé vers `/dashboard`, ce qui est le fonctionnement légitime de l'application).

## Vérifications
- Le login (Client et Pro) transite désormais sans freeze vers les tableaux de bords.
- Les tests RBAC évaluent correctement les périmètres de redirection des Server Layouts sans `as any`.
- Le contexte E2E `error-context.md` a permis de prouver la divergence entre l'état du DOM (bloqué sur le form) et les logs Playwright.

## Prochaines étapes
- Lancer les E2E sur la CI (GitHub Actions)
- Poursuivre sur **Session 02** une fois que la branche `main` est au vert (Baseline CI saine).
