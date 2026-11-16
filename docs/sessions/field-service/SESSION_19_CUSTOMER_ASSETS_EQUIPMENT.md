# Session 19 — Customer Assets & Equipment Tracking (V1)

Date : 9 novembre 2026 · Branche : `migration/neon-full` · Migration : `drizzle/neon/0014_field_service_assets.sql`

## Objectif

Permettre à un professionnel Field Service (plombier, chauffagiste, électricien…) de tenir le parc d'équipements installés chez chaque client — chaudière, climatisation, tableau électrique, véhicule — avec marque, modèle, numéro de série, dates de mise en service et de garantie, puis de rattacher ces équipements aux interventions pour obtenir leur historique d'entretien.

## Périmètre livré

| Élément | Détail |
|---|---|
| Table `field_service_assets` | Client obligatoire, site facultatif (du même client), 11 catégories, 3 états (`active`, `out_of_service`, `decommissioned`), marque/modèle/n° de série, mise en service, fin de garantie, notes |
| Table `field_service_work_order_assets` | Lien opération ↔ équipement, organisation **et client** identiques garantis par clés étrangères composites |
| Index | `field_service_work_orders_id_org_client_unique` (nouvel index additif sur les opérations) + 9 index sur les nouvelles tables, dont l'unicité du n° de série par fabricant et organisation |
| Gardes SQL | Identité immuable (id, organisation, client, création), `updated_at` automatique, équipement retiré en lecture seule, interdiction de rattacher un équipement retiré, liens non modifiables, `protect_runtime_fields` (tenant immuable) |
| RLS | `account_active_required` (RESTRICTIVE) + politique professionnelle `is_current_field_service_professional(organization_id)` sur les deux tables |
| Grants | Équipements : SELECT/INSERT/UPDATE (jamais DELETE — on retire du parc). Liens : SELECT/INSERT/DELETE (pas d'UPDATE) |
| Service | `src/lib/services/field-service-assets.service.ts` : création, modification, liste filtrée (nombre et date de dernière intervention), fiche avec historique et résumés des comptes rendus finalisés, rattachement/détachement, indicateurs (parc, hors service, garanties à échéance sous 60 jours) |
| Règles métier | Site et opération du même client ; pas de rattachement à un équipement retiré ; liste figée sur une opération terminée ou annulée ; erreurs métier lisibles (409/422) |
| Actions | `src/app/actions/field-service-assets.actions.ts` — résultat explicite `{ ok, data | error }` car Next.js masque en production le message des erreurs levées par une Server Action |
| Interface | `/operations/equipements` (indicateurs, recherche, filtres client/catégorie/état, création), `/operations/equipements/[id]` (fiche, modification, hors service / remise en service / retrait, historique), panneau « Équipements concernés » sur la fiche d'opération, entrée « Équipements clients » dans le menu Field Service, aide contextuelle |

Aucune modification des migrations fermées, aucune table supprimée, aucun changement paramédical.

## Preuves (exécutées le 9 novembre 2026, branche Neon `migration-validation`)

| Contrôle | Résultat |
|---|---|
| Migration rejouée en transaction annulée, puis appliquée | OK — 15 checksums de ledger |
| `db:check-contract` | 61/61 tables conformes |
| `db:check-custom-objects` | Grants, fonctions, triggers, RLS et politiques conformes |
| `tests/integration/field-service-assets.integration.test.ts` (ajouté à `test:rls`) | 15/15 |
| Non-régression intégration FS, tenant, confidentialité, conformité RLS | 24 + 25 + 58 + 19 + 5, tous verts |
| Unitaires + conformité (dont `__tests__/unit/field-service/assets.test.ts`, 13 cas) | 761/761, 88 fichiers |
| Playwright `e2e/field-service-assets.spec.ts` (build production) | 1/1 : création, doublon refusé, recherche, rattachement à une intervention, historique après rechargement, hors service puis retrait en lecture seule |
| Playwright Field Service existants | Opérations 2/2, quote-to-cash 1/1 |
| Typecheck / lint / build | PASS / 0 erreur / PASS |

Les parcours navigateur ont tourné dans la VM Linux du poste : un fichier de configuration local non versionné y allongeait seulement les délais d'attente (latence réseau vers Neon), sans retirer d'assertion.

## Session 19B — maintenance préventive et étiquette QR (9 novembre 2026)

Migration additive `drizzle/neon/0015_field_service_asset_maintenance.sql`.

| Élément | Détail |
|---|---|
| Colonnes | `maintenance_interval_months` (1 à 120, facultatif), `next_maintenance_on` (date), index `(organization_id, next_maintenance_on)` |
| Trigger | `trg_field_service_asset_maintenance_advance` : à la clôture d'une opération de type « maintenance », la prochaine échéance de chaque équipement rattaché et périodique devient « date de fin (heure de Paris) + périodicité ». Bornée à l'organisation de l'opération, jamais sur un équipement retiré |
| Création | Échéance saisie, sinon mise en service (ou aujourd'hui) + périodicité |
| Service / action | `scheduleAssetMaintenance` : crée l'opération d'entretien (même client et site) et y rattache l'équipement |
| Interface | Indicateur et filtre « Entretiens à prévoir (30 j) », badges « Entretien à prévoir / en retard », bloc entretien sur la fiche avec « Planifier l'entretien », périodicité dans les formulaires |
| Étiquette QR | `/operations/equipements/[id]/etiquette` : étiquette imprimable dont le QR ouvre la fiche authentifiée (aucune donnée publique) |

Preuves (branche `migration-validation`) : contrat 61/61, objets SQL conformes (fonction et trigger ajoutés aux contrôles), 18/18 tests DB/RLS équipements (dont 3 de maintenance), 17 unitaires équipements, 765/765 unitaires, Playwright ASSETS_01 et ASSETS_02 sur build production, typecheck, lint 0 erreur.

## CI GitHub — premier run (PR #1)

Le premier run GitHub a échoué sur des délais de 5 s dépassés (`core-privacy`, `core-billing`) : le runner américain interroge Neon Francfort. L'assertion « 4 factures au lieu de 3 » était une conséquence d'un test interrompu. Correction : `--testTimeout=90000` pour les suites d'intégration dans `ci-branch.mjs` et `test:neon-boundaries`, délai d'assertion Playwright à 20 s. Aucune assertion modifiée.

## Reporté (Session 19C)

- Pièces jointes (notice, PV de mise en service) via le stockage privé.
- Visibilité des équipements et de l'historique dans le portail client (Session 20).
- Relances automatiques par e-mail des entretiens à prévoir.
