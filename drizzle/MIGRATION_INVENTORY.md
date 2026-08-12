# Inventaire des migrations Drizzle (PostgreSQL)

Ce fichier garde la trace des migrations SQL générées via Drizzle et de leur rôle.
Historiquement, les migrations étaient ignorées dans `.gitignore`, ce qui créait des désynchronisations de schéma dans l'intégration continue et sur Supabase (voir failles MS-011 et MS-021). 
Désormais, **toutes les migrations doivent être traquées** via Git pour garantir la reproductibilité du déploiement.

## Migrations

| Migration | Date | Description |
|---|---|---|
| `0000_initial` | (existante) | Schéma de base généré initialement |
| `0001_audit_p0_fixes` | Août 2026 | Correction des types (Numeric, suppression `as any`), tables manquantes (VAT, Subscriptions) après l'audit P0 |
| *(à venir)* | | |
