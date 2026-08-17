# Rapport de Réconciliation du Schéma (Prompt 03C)

Ce document valide la réconciliation formelle entre le schéma applicatif (`schema.ts`) et l'instance locale vierge de développement.

## État de la Base Locale vs Schéma Drizzle
La migration `0009_medical_power_man.sql` a été entièrement regénérée via `drizzle-kit generate` pour garantir qu'aucune transaction implicite, ni opération destructrice, n'interfère avec le schéma de développement vierge.

### Types monétaires (`numeric(14,2)`)
- **Action** : Conversion confirmée vers `numeric(14,2)`.
- **Raison** : Cohérence avec le type custom `moneyNumeric` de Drizzle défini dans `schema.ts`. Drizzle peut ainsi assurer l'exactitude des manipulations monétaires.
- **Tables affectées** : `country_compliance_profiles`, `deals`, `invoice_lines`, `invoices`, `products`.

### Identifiants Utilisateurs (`users.id`)
- **Action** : Le type est maintenu à `text` et ne passe **PAS** à `uuid` dans la base locale.
- **Raison** : `schema.ts` déclare explicitement `id: text('id').primaryKey()`. L'alignement de ce type doit d'abord se faire dans le schéma ORM (Prompt 03B) si une bascule UUID stricte est requise. L'insertion via les triggers Supabase utilise `id::text` pour assurer la compatibilité.

### MFA
- **Action** : Suppression des colonnes `mfa_enabled` et `mfa_secret`.
- **Raison** : Les colonnes étaient déjà absentes du fichier `schema.ts`. Cette étape finalise le nettoyage local de l'ancien système MFA.

### RLS et Triggers Supabase
Les politiques RLS et le trigger d'import `handle_new_auth_user` ont été intégrés directement à la suite de la migration de schéma (hors d'un bloc BEGIN/COMMIT global qui causait les échecs dans `db:migrate`).

## Résultat `db:check-drift`
L'algorithme de détection a été réécrit pour générer formellement les migrations sur le dossier cible (`drizzle/postgres`).
**Résultat :** AUCUN fichier de migration supplémentaire généré. Le schéma local est 100% synchronisé avec `schema.ts`.
