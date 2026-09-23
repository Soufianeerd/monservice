# SESSION 17 — FIELD SERVICE OPERATIONS : WORK ORDERS, CHANTIERS, INTERVENTIONS, SITES, ASSIGNATIONS & RAPPORTS

## 🎯 1. Résumé Exécutif

La **Session 17** implémente l'intégralité de la couche opérationnelle Field Services / BTP / Artisans / Métiers Techniques de **MonSERVICE**.
Elle transforme la fondation architecturale multi-verticale (Session 16) en un moteur opérationnel réel, réactif et universel, commun aux 36 métiers couverts par la plateforme.

---

## 🏛️ 2. Architecture & Modèle de Données (Migration 0020)

Une seule migration canonique a été créée et appliquée : `drizzle/postgres/0020_field_service_operations.sql` (avec snapshot `meta/0020_snapshot.json`). Les migrations 0013 à 0019 restent strictement inchangées.

### 2.1 Les 5 Tables Opérationnelles
1. **`field_service_sites`** : Sites, chantiers, ateliers, adresses d'intervention avec coordonnées géographiques (bornées `[-90, 90]` et `[-180, 180]`) et instructions d'accès.
2. **`field_service_work_orders`** : Ordres de travail / chantiers / interventions universels avec référence unique par tenant (`WO-YYYY-XXXXXXXX`), types de travaux (`job`, `intervention`, `installation`, `maintenance`, `repair`, `inspection`, `project`, `other`), priorités (`low`, `medium`, `high`, `urgent`), dates planifiées (`scheduled_end >= scheduled_start`) et statut (`draft`, `scheduled`, `in_progress`, `paused`, `completed`, `cancelled`).
3. **`field_service_work_order_assignments`** : Assignation des techniciens / intervenants avec rôles (`lead`, `technician`, `assistant`, `observer`) et intégrité organisationnelle garantie par trigger.
4. **`field_service_work_reports`** : Rapports et comptes rendus d'intervention / fin de chantier avec statut (`draft`, `finalized`), horodatage et verrouillage d'immuabilité une fois finalisé.
5. **`field_service_work_order_status_history`** : Journal d'audit append-only historisant automatiquement chaque transition d'état et l'utilisateur à l'origine du changement.

### 2.2 Clés Étrangères Composites & Invariants Multi-Tenant DB
Afin d'interdire tout contournement inter-tenant (même en cas d'accès direct PostgREST authentifié), l'ensemble des relations clés s'appuie sur des foreign keys composites couplées à `organization_id` :
- **Sites $\rightarrow$ Clients** : `(client_id, organization_id) REFERENCES clients(id, organization_id)`
- **Work Orders $\rightarrow$ Clients** : `(client_id, organization_id) REFERENCES clients(id, organization_id)`
- **Work Orders $\rightarrow$ Créateur** : `(created_by_user_id, organization_id) REFERENCES users(id, organization_id)`
- **Work Orders $\rightarrow$ Sites** : `(site_id, organization_id, client_id) REFERENCES field_service_sites(id, organization_id, client_id)`
- **Assignments $\rightarrow$ Work Orders** : `(work_order_id, organization_id) REFERENCES field_service_work_orders(id, organization_id)`
- **Assignments $\rightarrow$ Utilisateurs** : `(user_id, organization_id) REFERENCES users(id, organization_id)`
- **Reports $\rightarrow$ Work Orders** : `(work_order_id, organization_id) REFERENCES field_service_work_orders(id, organization_id)`
- **Reports $\rightarrow$ Auteurs** : `(author_user_id, organization_id) REFERENCES users(id, organization_id)`
- **Status History $\rightarrow$ Work Orders** : `(work_order_id, organization_id) REFERENCES field_service_work_orders(id, organization_id)`
- **Status History $\rightarrow$ Auteurs** : `(changed_by_user_id, organization_id) REFERENCES users(id, organization_id)`

### 2.3 Unicité Active & Triggers d'Immuabilité Structurelle
- **Unicité Collaborateur Actif** : Index partiel unique `field_service_assignments_active_user_unique` sur `(work_order_id, user_id) WHERE is_active = true`. Interdit les doublons d'assignation active tout en autorisant une réassignation après `unassign`. Le service applicatif capture le code SQL 23505 et renvoie l'erreur stable `WORKER_ALREADY_ASSIGNED`.
- **Cohérence Métadonnées d'Assignation** : CHECK constraint garantissant `is_active = true <=> removed_at IS NULL` et `is_active = false <=> removed_at IS NOT NULL`.
- **Triggers d'Immuabilité Structurelle** :
  - `enforce_field_service_site_immutability()` : Verrouille `id`, `organization_id`, `client_id`, `created_at` après INSERT.
  - `enforce_field_service_work_order_transition()` : Verrouille `id`, `organization_id`, `client_id`, `created_by_user_id`, `reference`, `created_at` après INSERT, applique la machine à états et interdit la modification des champs métier d'une opération terminale (`completed` / `cancelled`).
  - `enforce_field_service_assignment_invariants()` : Verrouille `id`, `organization_id`, `work_order_id`, `user_id`, `assigned_at`, `created_at` et valide que le profil assigné est `professional`.
  - `enforce_field_service_work_report_transition()` : Verrouille `id`, `organization_id`, `work_order_id`, `author_user_id`, `created_at` sur les brouillons, et bloque tout UPDATE/DELETE dès finalisation.
  - `enforce_field_service_status_history_append_only()` : Bloque les INSERT directs manuels ainsi que tout UPDATE ou DELETE.
  - `log_field_service_work_order_status_history()` : Inscription automatique de chaque transition d'état via trigger interne.

---

## 🛡️ 3. Sécurité RLS & Autorité Serveur

- **Fonction Helper RLS** : `is_current_field_service_professional(p_organization_id text)` vérifie côté PostgreSQL que l'utilisateur est authentifié, appartient à l'organisation et que celle-ci relève du secteur `field_services` ou `artisan`.
- **Politiques RLS Multi-Tenant** :
  - SELECT, INSERT, UPDATE réservés aux professionnels actifs de l'organisation.
  - Isolation inter-tenant totale (0 ligne retournée pour toute tentative d'accès croisé).
  - Exclusion des clients et utilisateurs anonymes (0 ligne retournée).
  - Exclusion des praticiens paramédicaux (secteur `health`).
  - Aucun droit direct `DELETE` accordé aux utilisateurs authentifiés sur les tables opérationnelles (intégrité et traçabilité complètes).
- **Autorité Serveur & Défense en Profondeur** : Les 11 Server Actions valident les entrées brutes via des schémas Zod stricts. `organizationId`, `createdByUserId` et `authorUserId` sont exclusivement dérivés de la session serveur authentifiée.

---

## 🖥️ 4. Expérience Utilisateur & Navigation

- **Routes réelles** :
  - `/operations` : Liste complète, filtres par statut, recherche plein texte multi-colonnes, indicateurs et statistiques.
  - `/operations/nouveau` : Création rapide d'intervention / chantier avec sélection du client et création de site à la volée via modale dédiée.
  - `/operations/[id]` : Vue détaillée d'opération avec assignation d'équipe, planification, changement d'état direct, rédaction de compte rendu d'intervention et historique chronologique.
- **Terminologie Dynamique** : Les 36 métiers de l'artisanat et du BTP disposent d'un vocabulaire adapté (ex. *Chantier* pour le maçon, *Intervention* pour le plombier/électricien, *Ordre de réparation* pour le mécanicien automobile, *Prise en charge* pour le réparateur de smartphones, *Mission* pour l'architecte).
- **Tableau de bord Métier** : `FieldServiceDashboard.tsx` enrichi avec les KPI réels d'opérations du jour, opérations en cours, planifiées et terminées.
- **Design & Responsive** : UI soignée avec Tailwind CSS / Lucide Icons, support mobile 390x844 natif et zéro cast menteur (`as any`).

---

## 🧪 5. Matrice de Validation

Toutes les suites requises de la Session 17 sont validées :

| Suite de Tests | Description | Statut |
|---|---|---|
| `db:check-drift` | Détection de dérive schéma Drizzle / Postgres | ✅ 0 dérive |
| `db:check-contract` | Validation des contrats de schéma (55 tables, composite FKs & contraintes) | ✅ Conforme |
| `db:check-custom-objects` | Vérification des triggers, fonctions et index custom | ✅ Conforme |
| `field-service-operations-db.integration.test.ts` | Intégrité DB, 10 composite FKs, 5 triggers d'immuabilité, unicité active & transitions | ✅ 24/24 passants |
| `field-service-operations-rls.integration.test.ts` | Isolation RLS multi-tenant, tests d'attaques adversariales PostgREST | ✅ Conforme |
| `operations-actions.test.ts` | Validation Zod des Server Actions, autorité serveur et cas limites | ✅ 14/14 passants |
| `generic-engine.test.ts` | Compatibilité universelle des 36 packs métiers sur le moteur | ✅ 3/3 passants |
| `field-service-operations-journey.spec.ts` | Cycle de vie persistant E2E complet (création site $\rightarrow$ opération $\rightarrow$ assignation $\rightarrow$ rapport $\rightarrow$ finalisation $\rightarrow$ clôture $\rightarrow$ reload) & smoke mobile | ✅ Conforme |
