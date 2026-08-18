# Rapport de Réconciliation du Schéma (Prompt 03C / 03D)

Ce document valide la réconciliation formelle entre le schéma applicatif (`schema.ts`), les migrations canoniques, et l'instance locale de développement. **La production est laissée intacte.**

## Matrice de Réconciliation

| OBJECT | SCHEMA_TS | CANONICAL_MIGRATION | FRESH_LOCAL | REMOTE_PRODUCTION | STATUS | DECISION |
|--------|-----------|---------------------|-------------|-------------------|--------|----------|
| **Tables** | Défini (dynamique) | Présent (0009) | Vérifié | 24 tables | IN_SYNC | Conserver `schema.ts` canonique |
| **Columns (Types)** | `numeric(14,2)` etc. | ALTER TYPE (0009) | Vérifié | `real`/`int` (0008) | IN_SYNC_LOCAL | Planifier le déploiement |
| **MFA Columns** | Absentes | DROP COLUMN (0009) | Vérifié | Présentes (0008) | IN_SYNC_LOCAL | Prévoir `DESTRUCTIVE_REVIEW` pour prod |
| **users.id Type** | `text` | Maintenu | Vérifié | `text` | IN_SYNC | Conserver `text` |
| **RLS Enabled** | Non visible | ALTER TABLE ENABLE (0009)| Vérifié | Désactivé / Partiel | IN_SYNC_LOCAL | Planifier le déploiement |
| **RLS Policies** | Non visible | CREATE POLICY (0009) | Vérifié | Incomplètes/sur `public` | IN_SYNC_LOCAL | Planifier le déploiement |
| **Functions** | Non visible | `handle_new_auth_user`, `current_organization_id` | Vérifié | Absentes | IN_SYNC_LOCAL | Planifier le déploiement |
| **Triggers** | Non visible | `on_auth_user_created` (0009) | Vérifié | Absents | IN_SYNC_LOCAL | Planifier le déploiement |

## Preuve d'Audit Production (READ ONLY)
Suite à un audit direct sur la base de production distante (`aws-0-eu-north-1.pooler.supabase.com`), nous avons relevé les faits suivants :

1. **Migrations Drizzle** : La migration `0009_...` n'apparaît **pas** dans le journal `__drizzle_migrations`. Seules les migrations précédentes (ex: hash `e59a...`, `e805...`) sont présentes. La migration 0009 locale peut donc être modifiée.
2. **GRANTS (Privilèges PostgreSQL)** : Actuellement, les rôles `anon` et `authenticated` possèdent **tous les privilèges** (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`) sur presque toutes les tables applicatives (`clients`, `invoices`, etc.). Ce comportement par défaut très permissif s'appuie uniquement sur RLS pour la sécurité.
3. **Fonctions** : Les fonctions `handle_new_auth_user` et `current_organization_id` n'existent pas en production (0 résultats trouvés dans `pg_proc`).
4. **Policies** : Des politiques existent (ex: `Users can access their organization's data`), mais avec `roles: [ 'public' ]` au lieu de ciblages stricts.

Cette preuve valide la nécessité absolue de redéfinir un contrat de permissions (`GRANT` / `REVOKE`) sécurisé dans la migration `0009`.

## Dérive et Contrats

- `db:check-drift` : Vérifie que l'historique de migration généré par Drizzle est cohérent avec le snapshot actuel (migration history consistency).
- `db:check-contract` : Vérifie formellement que toutes les tables et colonnes définies dans `schema.ts` sont créées et présentes dans `information_schema.columns` en base de données.
- `db:check-custom-objects` : Vérifie que les fonctions `handle_new_auth_user`, `current_organization_id`, le trigger `on_auth_user_created` et la configuration globale RLS sont bien opérationnels.
