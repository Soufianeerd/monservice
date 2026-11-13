# Session 20 — Portail client Field Service (V1)

Date : 10 novembre 2026 · Migration : `drizzle/neon/0016_field_service_client_portal.sql`

## Objectif

Le client d'un artisan suit ses interventions depuis son espace MonService, lit les comptes rendus finalisés, consulte ses équipements (garanties, prochains entretiens, historique) et signe la réception des travaux, avec ou sans réserves. L'artisan voit la réception sur la fiche de l'intervention.

## Changement de règle d'accès (volontaire)

Jusqu'à la Session 19, un compte client ne voyait **aucune** donnée Field Service, et deux tests l'imposaient. La Session 20 remplace cette règle par :

| Donnée | Visible par le client relié à la fiche client |
|---|---|
| Interventions | Oui, sauf les **brouillons** |
| Sites, équipements | Oui, ceux de sa fiche |
| Liens intervention ↔ équipement | Oui, pour les interventions visibles |
| Comptes rendus | **Finalisés uniquement** |
| Affectations des techniciens, historique des statuts | Non |
| Toute écriture opérationnelle | Non (lecture seule) |

Un autre compte client, un professionnel d'une autre organisation et les sessions anonymes ne voient rien. Les deux anciens tests (`field-service-operations-rls`, `field-service-assets`) vérifient désormais que le client ne voit **que** sa fiche.

## Base de données

- Fonctions `is_current_field_service_client(org, client)` et `is_current_field_service_client_work_order(id)` (SECURITY DEFINER, exécutables par le runtime uniquement).
- Cinq politiques SELECT client ajoutées ; aucune politique existante modifiée.
- Table `field_service_work_report_acknowledgements` : une réception par compte rendu finalisé, signataire = utilisateur de la session, décision `accepted` / `accepted_with_reservations` (réserves obligatoires dans ce cas), horodatage serveur, immuable (trigger + aucun grant UPDATE/DELETE). Insertion réservée au client relié ; lecture par ce client et par les professionnels de l'organisation.

## Application

- Service `src/lib/services/field-service-client-portal.service.ts`, action `acknowledgeWorkReportAction` (garde `requireProfileType('client')`, résultat explicite).
- Pages `/client/interventions`, `/client/interventions/[id]` (comptes rendus, équipements, formulaire de réception avec confirmation explicite), `/client/equipements`.
- Raccourcis sur le tableau de bord client ; panneau « Réception par le client » sur la fiche d'intervention du professionnel.

## Preuves (branche Neon `migration-validation`, 10 novembre 2026)

| Contrôle | Résultat |
|---|---|
| Migration en transaction annulée puis appliquée | OK — 17 checksums |
| `db:check-contract` / `db:check-custom-objects` | 62/62 tables / PASS (fonctions, trigger, politiques ajoutés) |
| `field-service-client-portal.integration.test.ts` | 7/7 (lecture limitée, brouillons et interne cachés, lecture seule, isolation, réceptions refusées : brouillon, autre client, usurpation, professionnel, réserves vides ; réception unique et immuable) |
| Non-régression intégration | FS opérations 25/25, équipements 18/18, facturation 24/24, tenant 58/58, confidentialité 19/19, conformité 5/5 |
| Unitaires | 774/774 (dont 6 nouveaux) |
| Playwright (build production) | `field-service-client-portal.spec.ts` 3/3 ; client 1/1, parcours client 1/1, portail patient 3/3 |
| Typecheck / lint / build | PASS / 0 erreur / PASS |

## Limites et suite

- Le client doit disposer d'un compte relié à sa fiche (`clients.user_id`) ; l'invitation d'un client par l'artisan reste à concevoir.
- Pas de notification e-mail à la finalisation d'un compte rendu (dépend de l'expéditeur Resend, cf. bascule).
- Signature nominative horodatée (pas de signature manuscrite ni de valeur eIDAS avancée).
