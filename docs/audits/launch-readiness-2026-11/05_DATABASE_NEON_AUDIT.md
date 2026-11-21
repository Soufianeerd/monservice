# 05 — Base de données et Neon

Sources : code de la branche, `docs/database/neon-migration.md`, `docs/deployment/*`, runs CI. **Aucune connexion à une base distante n'a été ouverte pendant cet audit.**

## Réponses

| Question | Réponse | Niveau de preuve |
|---|---|---|
| Base utilisée en local et en CI | Neon, une branche jetable par run, créée depuis un gabarit vide | Vérifié (`scripts/neon/ci-branch.mjs`, runs CI) |
| Base utilisée en production | Projet Neon à Francfort, migrations 0000–0013 appliquées, données importées. **Le site public ne l'utilise pas encore** : aucun build valide n'est déployé | Documenté, non revérifié |
| Dépendances Supabase restantes | Aucune dans le code applicatif. Restent : `@supabase/auth-js` en dépendance indirecte du SDK Neon, dossier `supabase/`, historique `drizzle/postgres`. Le projet Supabase source est conservé intact pour le retour arrière | Vérifié dans le code |
| Authentification | Neon Auth gérée (Better Auth 1.7.18), SDK en bêta | Vérifié |
| Documents | Stockage objet compatible S3, privé, URL signées | Vérifié dans le code |
| Propagation de l'identité | Session vérifiée → variable `monservice.provider_user_id` posée dans la transaction → `current_app_user_id()` → politiques RLS | Vérifié dans le code |
| Application des politiques | Rôle `monservice_runtime` contrôlé à chaque transaction (ni `BYPASSRLS`, ni super-utilisateur, ni héritage) ; rôles distincts pour Stripe et les rappels | Vérifié dans le code |
| Migrations exécutées | Validation et CI : 0000–0018. Production : 0000–0013 ; **0014–0018 à rejouer** | Documenté |
| Migration sans perte | Import consigné avec rapport et sommes de contrôle | Documenté, non revérifié |
| Sauvegardes | Rétention observée de **6 heures** | Documenté — **insuffisant (LR-005)** |
| Restauration testée | Aucune trace | **Absent** |
| Données de santé sur cette architecture | Non démontré conforme (LR-006) | — |

## Mesures

- 57 tables dans la structure initiale, 168 `CREATE POLICY`, 124 activations RLS, 48 fonctions `SECURITY DEFINER` sur l'ensemble des migrations Neon.
- Les fonctions `SECURITY DEFINER` relues fixent `search_path` et révoquent `PUBLIC`. La relecture n'a pas couvert les 48.

## Constats

| ID | Constat | Priorité | Action |
|---|---|---|---|
| LR-005 | Rétention de 6 h, pas d'exercice de restauration | P0 | Passer à un plan Neon avec restauration à un instant donné d'au moins 7 jours ; restaurer une fois une branche à H-24 et consigner la durée ; ajouter un export logique quotidien hors Neon |
| LR-029 | Migrations 0014–0018 absentes de la production ; les futures 0019 (acceptation du devis) et 0020 (fermeture des accès client) s'y ajoutent | P0 (étape de bascule) | Rejouer dans l'ordre avec la procédure existante, puis les trois vérifications en lecture seule |
| LR-030 | Aucune politique `FORCE ROW LEVEL SECURITY` | P3 | Acceptable tant que l'exécution n'utilise jamais le rôle propriétaire, ce que le client SQL impose ; à documenter comme invariant |
| LR-031 | Dates stockées en texte ISO | P3 | Hérité de SQLite ; les comparaisons fonctionnent en ordre lexicographique. Ne pas migrer avant le lancement |
| LR-032 | Une seule connexion par instance en production | Info | Adapté au serverless ; surveiller la latence quand une page enchaîne plusieurs transactions |
| LR-024 | Fermeture d'un secteur non garantie en base | P2 | Voir `04_SECURITY_AUDIT.md` |

## Performance SQL

Non mesurée : pas d'accès à une base. À faire sur la branche de validation avant le pilote : `EXPLAIN ANALYZE` des cinq écrans les plus lourds (tableau de bord, liste des clients, liste des factures, agenda de la semaine, détail d'une opération) et relevé des requêtes par page pour détecter les requêtes en cascade.

## Architecture cible

Elle est déjà en place sur la branche. Ce qui reste est de l'exploitation :

1. Plan Neon payant avec restauration à un instant donné.
2. Trois environnements étanches : production, validation, branches CI jetables (existant) ; branche dédiée aux aperçus Netlify (manquant).
3. Variables Netlify limitées au rôle d'exécution (jamais le propriétaire).
4. Export logique chiffré quotidien vers un stockage distinct.
5. Retour arrière : republier le déploiement précédent ; les migrations 0014–0019 sont additives.
6. Décommissionnement de Supabase après 30 jours de production stable, sur décision explicite.
