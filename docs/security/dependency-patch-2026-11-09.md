# Correctif de sécurité des dépendances — 9 novembre 2026

## Constat

`npm audit --omit=dev` signalait, sur le code du 12 octobre : 2 critiques, 3 élevées.

| Paquet | Avant | Après | Motif |
|---|---|---|---|
| `next`, `eslint-config-next` | 16.4.0 | 16.4.5 | RCE (optimisation d'images SVG, `use cache`) et déni de service via Server Actions, versions ≤ 16.4.0 |
| `@neondatabase/auth` | 0.5.0-beta | 0.7.0-beta | Dernière version du SDK Neon Auth |
| `better-auth` et `@better-auth/*` | 1.6.23 | 1.7.18 (overrides npm) | Prise de compte via OAuth proxy / OAuth state (< 1.7.7). Le SDK Neon 0.7.0-beta embarque encore 1.7.6 : les `overrides` de `package.json` imposent 1.7.18 |
| `zod` | < 4.6.6 transitif | 4.6.7 partout (`overrides`) | Épuisement mémoire |

Résultat : **0 critique, 0 élevée** (7 faibles : chaîne react-email/deepmerge du SDK Neon Auth UI).
À retirer : les `overrides` dès que `@neondatabase/auth` embarque better-auth ≥ 1.7.7.

## Validation exécutée (branche Neon `migration-validation`, jamais la production)

| Contrôle | Résultat |
|---|---|
| typecheck, lint (0 erreur), build production | PASS |
| Unitaires + conformité | 745/745 (avant Session 19) |
| `db:check-drift`, `db:check-contract`, `db:check-custom-objects` | PASS |
| `test:db-constraints` | 263/263 |
| `test:rls` | 198/198 |
| `neon-runtime-boundaries` + `neon-compliance-rls` | 13/13 (dont déconnexion réelle invalidant la session) |
| Playwright sur build production | 36/36 : authentification, client, RBAC, marketplace, conformité, professionnel, paramédical, quote-to-cash, opérations, portail patient, UX cabinet, guide pratique |

Non exécutables sans clé API Neon dans l'environnement (rejoués par la CI GitHub `ci-branch.mjs`) :
`neon-reenrollment` (1), `auth-recovery.spec.ts` (2, vérification e-mail obligatoire).

Remarques : trois délais dépassés (5 s par défaut) sont dus à la latence réseau de l'environnement d'exécution
et passent avec un délai de 60 s ; les échecs initiaux de `marketplace.spec.ts` venaient de fixtures modifiées
par les tests de base de données, corrigées en rejouant le seed synthétique.
