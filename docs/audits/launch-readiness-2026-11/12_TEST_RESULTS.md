# 12 — Tests exécutés

## Rejoués le 17 novembre 2026

Environnement : clone propre de `migration/neon-full` @ `e4c82fc`, Linux, Node 22, `npm ci`.

| Commande | Résultat |
|---|---|
| `npx tsc --noEmit` | **Réussi**, 0 erreur |
| `npx eslint .` | **Réussi**, 0 erreur, 348 avertissements |
| `npx vitest run __tests__/unit tests/unit __tests__/compliance` | **Réussi**, 93 fichiers, **802/802** tests, 68,6 s |
| `npm audit --omit=dev` | **0** vulnérabilité |
| `npm audit` | 24 (22 modérées, 2 élevées : `undici`, `vite`) — dépendances de développement |
| `npm run build` | **Non concluant** : compilation et typage passés (20,6 s), collecte des pages interrompue par un secret de cookie invalide dans mon environnement de test |

## Non exécutés, et pourquoi

| Commande | Raison |
|---|---|
| `db:check-drift`, `db:check-contract`, `db:check-custom-objects` | Nécessitent une connexion à une base Neon ; aucune n'a été ouverte |
| `test:db-constraints`, `test:rls`, `test:neon-boundaries` | Écrivent des données de test ; la procédure du projet est la branche jetable créée par la CI |
| `test:e2e` (19 specs) | Idem, plus un navigateur et un serveur applicatif |
| Tests d'intrusion actifs, Lighthouse, lecteur d'écran, captures | Pas d'instance déployée ni isolée accessible |

## Preuves CI (GitHub Actions, workflow « CI Neon »)

| Run | Commit | Date | Résultat |
|---|---|---|---|
| 42859109019 | `197a3ee` | 10 nov. | **Succès** — dernière validation complète |
| 43037653778 | `3f6a9ae` | 11 nov. | Échec |
| 43216592714 | `989fcb3` | 12 nov. | Échec |
| 43222732950 | `832b504` | 12 nov. | Échec — « branch not found » sur la création d'utilisateur de test |
| 43404953476 | `30f6b8a` | 13 nov. | Échec — même cause |
| 43975178910 | `9086307` | 16 nov. | Échec — le test d'intégration passe ; `e2e/auth-recovery.spec.ts:94` échoue sur le même appel |
| 43981371440 | `e4c82fc` | 17 nov. | En cours à la clôture de l'audit. Correctif poussé pendant l'audit : même repli appliqué au parcours navigateur. **Résultat à confirmer** |

Conséquence : les commits postérieurs au 10 novembre (fermeture de secteurs, statistiques du cabinet) n'ont **aucune validation complète verte**.

## Trous de couverture constatés

1. Aucun parcours ne s'exécute avec le plan réellement attribué à un nouvel inscrit : le jeu de données force tous les professionnels en `pro` actif (`scripts/e2e/seed-local.ts:963-970`).
2. Aucun test d'organisation à plusieurs comptes créés par l'interface (la fonction n'existe pas).
3. Un seul navigateur (Chromium), aucun profil mobile.
4. Aucun test d'accessibilité automatisé.
5. Aucun test de charge ni de performance.
6. Les tests des portails client et patient valident un périmètre désormais hors V1 ; à conserver sous indicateur.
