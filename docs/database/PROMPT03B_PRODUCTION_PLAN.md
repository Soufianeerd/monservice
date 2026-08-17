# Plan de Migration Production (Prompt 03B / 03D)

## Objectif
Préparer la base de données de production à recevoir la réconciliation (0009) sans interrompre le service, **sans exécuter de SQL de production à ce stade**.

## Analyse des Composants de la Migration 0009

### 1. Numeric Type Conversion (`numeric(14,2)`)
- **PRECHECK** : Vérifier que les montants actuels en DB rentrent dans 14,2.
- **CURRENT_PROD_STATE** : Actuellement `real` ou `integer` (à confirmer).
- **DATA_IMPACT** : Pas de perte de précision attendue si `real` -> `numeric`, mais DDL bloquant.
- **LOCK_RISK** : `ALTER TABLE ... ALTER COLUMN` pose un lock exclusif. Risque sur tables volumineuses.
- **BACKUP** : PITR ou backup ciblé des tables (invoices, deals).
- **APPLY** : Via `drizzle-kit migrate`.
- **POSTCHECK** : Vérifier la précision sur un invoice existant.
- **ROLLBACK** : Re-cast inverse (pourrait perdre de la précision si de nouvelles données ont été ajoutées).
- **CLASSIFICATION** : `REQUIRES_MAINTENANCE` (lié au lock éventuel).

### 2. DROP `mfa_enabled` et `mfa_secret`
- **PRECHECK** : Vérifier si des utilisateurs ont ces champs non nuls.
- **CURRENT_PROD_STATE** : Colonnes présentes, données existantes probables.
- **DATA_IMPACT** : **Destructif**. Perte des secrets MFA existants.
- **LOCK_RISK** : Lock modéré (`DROP COLUMN`).
- **BACKUP** : Extraire `id`, `mfa_enabled`, `mfa_secret` vers un bucket de sécurité.
- **APPLY** : Via `drizzle-kit migrate`.
- **POSTCHECK** : S'assurer que le code de production ne crashe pas en cherchant les colonnes.
- **ROLLBACK** : `ADD COLUMN` et script de restauration depuis le backup.
- **CLASSIFICATION** : `DESTRUCTIVE_REVIEW`.

### 3. Functions (`handle_new_auth_user`, `current_organization_id`)
- **PRECHECK** : Vérifier conflit de noms.
- **CURRENT_PROD_STATE** : Inexistantes.
- **DATA_IMPACT** : Aucun.
- **LOCK_RISK** : Aucun.
- **BACKUP** : Aucun.
- **APPLY** : `CREATE OR REPLACE FUNCTION`.
- **POSTCHECK** : Appel manuel de `current_organization_id()` en session test.
- **ROLLBACK** : `DROP FUNCTION`.
- **CLASSIFICATION** : `SAFE_ADDITIVE`.

### 4. Triggers (`on_auth_user_created`)
- **PRECHECK** : Vérifier que `auth.users` est bien exposé.
- **CURRENT_PROD_STATE** : Inexistant.
- **DATA_IMPACT** : Créera des rows dans `public.users` pour les nouveaux signups.
- **LOCK_RISK** : Lock bref sur `auth.users` (`CREATE TRIGGER`).
- **BACKUP** : Aucun.
- **APPLY** : `CREATE TRIGGER`.
- **POSTCHECK** : Créer un utilisateur test et vérifier `public.users`.
- **ROLLBACK** : `DROP TRIGGER`.
- **CLASSIFICATION** : `SAFE_ADDITIVE`.

### 5. RLS et Policies
- **PRECHECK** : Vérifier que `service_role` outrepasse bien le RLS pour l'accès backend s'il est utilisé.
- **CURRENT_PROD_STATE** : RLS non activé sur l'app.
- **DATA_IMPACT** : Bloque l'accès anonyme et non autorisé.
- **LOCK_RISK** : Lock exclusif bref pour `ALTER TABLE ENABLE ROW LEVEL SECURITY`.
- **BACKUP** : Aucun.
- **APPLY** : Via `drizzle-kit migrate`.
- **POSTCHECK** : Authentification via SDK et `SELECT` sur une table protégée.
- **ROLLBACK** : `ALTER TABLE DISABLE ROW LEVEL SECURITY`.
- **CLASSIFICATION** : `REQUIRES_MAINTENANCE` (impact massif sur les accès si l'API proxy n'utilise pas un token contournant ou valide).

## Exécution de Production (Bloquée)
Aucune exécution en production ne sera faite pour le moment. La production reste **READ ONLY** pour ce prompt.
