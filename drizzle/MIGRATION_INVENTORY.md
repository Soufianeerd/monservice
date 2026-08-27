# Inventaire des migrations Drizzle (PostgreSQL)

Ce fichier inventorie toutes les migrations versionnées dans le dépôt, avec leur statut vis-à-vis du journal officiel Drizzle et de la production (Supabase).

| file | source | journaled (YES/NO) | generated/manual | purpose | dependencies | production state | classification | action |
|---|---|---|---|---|---|---|---|---|
| `drizzle/0000_small_obadiah_stane.sql` | Racine `drizzle/` | NO | Generated (Stray) | Reliquat initial orphelin | N/A | UNKNOWN_PRODUCTION_STATE | OBSOLETE | À vérifier puis supprimer |
| `drizzle/postgres/0000_large_prima.sql` | Drizzle Kit | YES | Generated | Schéma initial de base | N/A | PROBABLY_APPLIED | CANONICAL | Conserver |
| `drizzle/postgres/0001_audit_p0_fixes.sql` | Manuel | NO | Manual | Fixes P0, tables VAT & Subscriptions | `0000_large_prima.sql` | UNKNOWN_PRODUCTION_STATE | MANUAL_REVIEW_REQUIRED | Isoler (hors journal canonique) |
| `drizzle/postgres/0001_flawless_namorita.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0000_large_prima` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0002_high_iron_man.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0001_flawless_namorita` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0002_supabase_auth_migration.sql`| Manuel | NO | Manual | Triggers auth Supabase | N/A | UNKNOWN_PRODUCTION_STATE | MANUAL_REVIEW_REQUIRED | Isoler (hors journal canonique) |
| `drizzle/postgres/0003_fk_and_transactions.sql` | Manuel | NO | Manual | Contraintes FK supplémentaires | N/A | UNKNOWN_PRODUCTION_STATE | MANUAL_REVIEW_REQUIRED | Isoler (hors journal canonique) |
| `drizzle/postgres/0003_old_cammi.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0002_high_iron_man` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0004_tidy_butterfly.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0003_old_cammi` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0005_lame_corsair.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0004_tidy_butterfly` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0006_slow_wild_child.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0005_lame_corsair` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0007_familiar_supernaut.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0006_slow_wild_child` | UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0008_worthless_sentinels.sql` | Drizzle Kit | YES | Generated | Modifications de schéma successives | `0007_familiar_supernaut`| UNKNOWN_PRODUCTION_STATE | CANONICAL | Conserver |
| `drizzle/postgres/0009_medical_power_man.sql` | Manuel | YES | Manual | Supabase auth webhook trigger setup | `0008_worthless_sentinels` | PROBABLY_APPLIED | CANONICAL | Conserver |
| `drizzle/postgres/0010_opposite_union_jack.sql` | Drizzle Kit | YES | Generated | Ajout profession dans organizations et constraint CHECK | `0009_medical_power_man` | NOT_APPLIED | CANONICAL | Conserver |
| `drizzle/postgres/0011_graceful_hammerhead.sql` | Drizzle Kit | YES | Generated | Correction bug SQL NULL sur la contrainte CHECK profession | `0010_opposite_union_jack` | NOT_APPLIED | CANONICAL | Conserver |

**Attention :** Les fichiers tagués `MANUAL_REVIEW_REQUIRED` (non répertoriés dans `_journal.json`) vont être déplacés dans `drizzle/manual_untracked/` afin de ne pas casser `drizzle-kit migrate` qui s'attend à une intégrité stricte entre le dossier et le journal. La stratégie pour ces fichiers sur Supabase sera décidée ultérieurement (PROMPT 03).
