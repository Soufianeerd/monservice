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

### 2.2 Clés Étrangères Composites & Invariants Métier
- **Composite FK Site-Client** : `field_service_work_orders(organization_id, site_id, client_id) REFERENCES field_service_sites(organization_id, id, clientId)` garantit formellement au niveau moteur PostgreSQL qu'une opération ne peut pas cibler un site appartenant à un autre client.
- **Triggers de Machine à États** :
  - `enforce_field_service_work_order_transition()` : Transitions autorisées (`draft` $\rightarrow$ `scheduled` $\rightarrow$ `in_progress` $\rightarrow$ `paused`/`completed` ; annulation avec motif obligatoire).
  - `enforce_field_service_work_report_transition()` : Immuabilité stricte des rapports finalisés (toute modification ou suppression directe d'un rapport finalisé est rejetée).
  - `enforce_field_service_assignment_invariants()` : Empêche l'assignation d'un utilisateur externe à l'organisation ou dont le profil n'est pas `professional`.
  - `log_field_service_work_order_status_history()` : Inscription automatique de toute transition d'état dans la table d'historique.

---

## 🛡️ 3. Sécurité RLS & Autorité Serveur

- **Fonction Helper RLS** : `is_current_field_service_professional(p_organization_id text)` vérifie côté PostgreSQL que l'utilisateur est authentifié, appartient à l'organisation et que celle-ci relève du secteur `field_services` ou `artisan`.
- **Politiques RLS Multi-Tenant** :
  - SELECT, INSERT, UPDATE réservés aux professionnels actifs de l'organisation.
  - Isolation inter-tenant totale (0 ligne retournée pour toute tentative d'accès croisé).
  - Exclusion des clients et utilisateurs anonymes (0 ligne retournée).
  - Exclusion des praticiens paramédicaux (secteur `health`).
  - Aucun droit direct `DELETE` accordé aux utilisateurs authentifiés sur les tables opérationnelles (intégrité et traçabilité complètes).
- **Autorité Serveur** : `requireFieldServiceContext()` dans `src/lib/workspaces/field-service/context.ts` valide systématiquement la session Supabase, l'organisation et le secteur avant toute Server Action.

---

## 🖥️ 4. Expérience Utilisateur & Navigation

- **Routes réelles** :
  - `/operations` : Liste complète, filtres par statut, recherche plein texte multi-colonnes, indicateurs et statistiques.
  - `/operations/nouveau` : Création rapide d'intervention / chantier avec sélection du client et création de site à la volée.
  - `/operations/[id]` : Vue détaillée d'opération avec assignation d'équipe, planification, changement d'état direct, rédaction de compte rendu d'intervention et historique chronologique.
- **Terminologie Dynamique** : Les 36 métiers de l'artisanat et du BTP disposent d'un vocabulaire adapté (ex. *Chantier* pour le maçon, *Intervention* pour le plombier/électricien, *Ordre de réparation* pour le mécanicien automobile, *Prise en charge* pour le réparateur de smartphones, *Mission* pour l'architecte).
- **Tableau de bord Métier** : `FieldServiceDashboard.tsx` enrichi avec les KPI réels d'opérations du jour, opérations en cours, planifiées et terminées.
- **Design & Responsive** : UI soignée avec Tailwind CSS / Lucide Icons, support mobile 390x844 natif et zéro `as any`.

---

## 🧪 5. Matrice de Validation

| Suite de Tests | Description | Résultat |
|---|---|---|
| `db:check-drift` | Détection de dérive schéma Drizzle / Postgres | ✅ 0 dérive |
| `db:check-contract` | Validation des contrats de schéma | ✅ 100% conforme |
| `db:check-custom-objects` | Vérification des triggers, fonctions et index custom | ✅ 100% conforme |
| `field-service-operations-db.integration.test.ts` | Intégrité DB, triggers, transitions d'états, dates & coordonnées | ✅ 13/13 passants |
| `field-service-operations-rls.integration.test.ts` | Isolation RLS multi-tenant, permissions et blocage DELETE | ✅ Conforme |
| `operations-actions.test.ts` | Validation Zod des Server Actions et cas limites | ✅ 14/14 passants |
| `generic-engine.test.ts` | Compatibilité universelle des 36 packs métiers sur le moteur | ✅ 3/3 passants |
| `field-service-operations-journey.spec.ts` | Parcours E2E Playwright desktop & mobile | ✅ Conforme |
