# Rapport de Réconciliation du Schéma (Prompt 03C / 03D)

Ce document valide la réconciliation formelle entre le schéma applicatif (`schema.ts`), les migrations canoniques, et l'instance locale de développement. **La production est laissée intacte.**

## Matrice de Réconciliation

| OBJECT | SCHEMA_TS | CANONICAL_MIGRATION | FRESH_LOCAL | REMOTE_PRODUCTION | STATUS | DECISION |
|--------|-----------|---------------------|-------------|-------------------|--------|----------|
| **Tables** | Défini (24 tables) | Présent (0009) | Vérifié (db:check-contract) | À vérifier | IN_SYNC | Conserver `schema.ts` canonique |
| **Columns (Types)** | `numeric(14,2)` etc. | ALTER TYPE (0009) | Vérifié | Non migré (0008) | IN_SYNC_LOCAL | Planifier le déploiement |
| **Columns (Defaults)** | Drizzle defaults | DEFAULT (0009) | Vérifié | Non migré | IN_SYNC_LOCAL | Planifier le déploiement |
| **PK/FK/Unique/Indexes**| Défini | Présent | Vérifié | À vérifier | IN_SYNC_LOCAL | Conserver tel quel |
| **MFA Columns** | Absentes | DROP COLUMN (0009) | Vérifié | Présentes (0008) | IN_SYNC_LOCAL | Prévoir `DESTRUCTIVE_REVIEW` pour prod |
| **users.id Type** | `text` | Maintenu | Vérifié | `text` | IN_SYNC | Conserver `text` |
| **RLS Enabled** | Non visible | ALTER TABLE ENABLE ROW LEVEL SECURITY (0009)| Vérifié (db:check-custom-objects) | Désactivé | IN_SYNC_LOCAL | Planifier le déploiement |
| **RLS Policies** | Non visible | CREATE POLICY (0009) | Vérifié | Absentes | IN_SYNC_LOCAL | Planifier le déploiement |
| **Functions** | Non visible | `handle_new_auth_user`, `current_organization_id` (0009) | Vérifié | Absentes | IN_SYNC_LOCAL | Planifier le déploiement |
| **Triggers** | Non visible | `on_auth_user_created` (0009) | Vérifié | Absents | IN_SYNC_LOCAL | Planifier le déploiement |

## Dérive et Contrats

- `db:check-drift` : Vérifie que l'historique de migration généré par Drizzle est cohérent avec le snapshot actuel (migration history consistency).
- `db:check-contract` : Vérifie formellement que toutes les tables et colonnes définies dans `schema.ts` sont créées et présentes dans `information_schema.columns` en base de données.
- `db:check-custom-objects` : Vérifie que les fonctions `handle_new_auth_user`, `current_organization_id`, le trigger `on_auth_user_created` et la configuration globale RLS sont bien opérationnels.
