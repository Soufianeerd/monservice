# Session 09 — Paramedical Scheduling & Availability Foundation

## Résumé Exécutif
La Session 09 introduit le socle de planification paramédical pour **MonSERVICE**.
Elle implémente :
1. Les types de séances paramédicales (`appointment_types`) avec durées, buffers et pas de créneaux.
2. Les disponibilités récurrentes par jour de la semaine pour chaque praticien et lieu (`practitioner_availability_rules`).
3. Les exceptions ponctuelles d'ouverture et de fermeture (`practitioner_availability_exceptions`), où la règle **CLOSED l'emporte toujours**.
4. La planification de séances Patient ↔ Praticien (`appointments`) avec lieu, salle optionnelle, horodatage UTC canonique et fuseau horaire du lieu snapshoté.
5. Une protection robuste contre la concurrence et les doubles réservations au niveau PostgreSQL via **l'extension `btree_gist` et 3 contraintes d'exclusion `EXCLUDE USING gist`**, générant l'erreur `SQLSTATE 23P01`, mappée en `AppError(409, 'SCHEDULING_CONFLICT')`.
6. L'isolation stricte multi-tenant par **Row Level Security (RLS)** réservée aux professionnels (`profile_type = 'professional'`).
7. Une interface utilisateur dédiée pour le calendrier paramédical, les disponibilités et les types de séances, tout en **préservant à 100% le calendrier CRM Generic existant**.

---

## HEAD Initial & Git
- **HEAD initial** : `fb3bb3355590d1a631d3326621acfc0e6cdf20f3` (Session 08B acceptée)
- **Feature commit** : `3986de577dae80a4f88fd4c30aa82082e2fc8b74`
- **Corrective commits** : `7243e24...`, `0da6f68...`, `831d490...`
- **HEAD final Session 09** : `831d490b1265524b7a13398b1e7f0f980bb34136`
- **CI Run ID final Session 09** : `33923051828` (status: `completed`, conclusion: `success`)
- **Branche** : `main`
- **Working tree initial & final** : clean

---

## Pourquoi Calendar CRM != Scheduling
Le module Agenda historique (`calendar.service.ts`) agrège des échéances de CRM générique :
- `tasks.dueDate`
- `invoices.dueDate`
- `deals.expectedCloseDate`

Ce calendrier n'est pas un moteur de rendez-vous médicaux/paramédicaux. La Session 09 maintient cette logique intacte pour les organisations en Workspace `generic` sous `/agenda/calendrier` et `/agenda/taches`, et branche un moteur dédié `scheduling` (`schedulingService`, `ParamedicalCalendar`) pour les organisations en Workspace `paramedical`.

---

## Architecture Base de Données

Exactement **4 nouvelles tables métier** créées dans la migration canonique unique `0014_wise_the_hunter.sql` :

### 1. `appointment_types`
- `id` text PRIMARY KEY
- `organization_id` text NOT NULL REFERENCES `organizations(id)`
- `name` text NOT NULL
- `description` text
- `duration_minutes` integer NOT NULL (CHECK: 5 à 480 min)
- `buffer_before_minutes` integer NOT NULL DEFAULT 0 (CHECK: 0 à 240 min)
- `buffer_after_minutes` integer NOT NULL DEFAULT 0 (CHECK: 0 à 240 min)
- `slot_step_minutes` integer NOT NULL DEFAULT 15 (CHECK: 5 à 120 min)
- `is_active` boolean NOT NULL DEFAULT true
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()
- **Unicités** : `(id, organization_id)` et `(organization_id, name)`

### 2. `practitioner_availability_rules`
- `id` text PRIMARY KEY
- `organization_id` text NOT NULL
- `practitioner_id` text NOT NULL
- `location_id` text NOT NULL
- `weekday` integer NOT NULL (CHECK: 0 à 6, convention 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
- `start_time` time NOT NULL
- `end_time` time NOT NULL (CHECK: `start_time < end_time`)
- `valid_from` date NOT NULL
- `valid_until` date (CHECK: `valid_until IS NULL OR valid_until >= valid_from`)
- `is_active` boolean NOT NULL DEFAULT true
- `created_at` timestamptz, `updated_at` timestamptz
- **FK composite** : `(organization_id, practitioner_id, location_id)` REFERENCES `practitioner_locations(organization_id, practitioner_id, location_id)`
- **Unicité** : `(organization_id, practitioner_id, location_id, weekday, valid_from, start_time, end_time)`

### 3. `practitioner_availability_exceptions`
- `id` text PRIMARY KEY
- `organization_id` text NOT NULL
- `practitioner_id` text NOT NULL
- `location_id` text NOT NULL
- `local_date` date NOT NULL
- `kind` text NOT NULL (CHECK: `kind IN ('open', 'closed')`)
- `start_time` time
- `end_time` time
- `is_active` boolean NOT NULL DEFAULT true
- `created_at` timestamptz, `updated_at` timestamptz
- **CHECK temps** : `(start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)`
- **FK composite** : `(organization_id, practitioner_id, location_id)` REFERENCES `practitioner_locations`

### 4. `appointments`
- `id` text PRIMARY KEY
- `organization_id` text NOT NULL
- `patient_id` text NOT NULL
- `practitioner_id` text NOT NULL
- `appointment_type_id` text NOT NULL
- `location_id` text NOT NULL
- `room_id` text
- `created_by_user_id` text NOT NULL
- `starts_at` timestamptz NOT NULL
- `ends_at` timestamptz NOT NULL
- `occupancy_starts_at` timestamptz NOT NULL
- `occupancy_ends_at` timestamptz NOT NULL
- `timezone` text NOT NULL (snapshoté depuis `practice_locations.timezone`)
- `status` text NOT NULL DEFAULT 'scheduled' (CHECK: `status IN ('scheduled')`)
- `created_at` timestamptz, `updated_at` timestamptz
- **FKs composites** :
  - `(patient_id, organization_id)` REFERENCES `patient_profiles(id, organization_id)`
  - `(practitioner_id, organization_id)` REFERENCES `practice_practitioners(id, organization_id)`
  - `(appointment_type_id, organization_id)` REFERENCES `appointment_types(id, organization_id)`
  - `(location_id, organization_id)` REFERENCES `practice_locations(id, organization_id)`
  - `(organization_id, practitioner_id, location_id)` REFERENCES `practitioner_locations`
  - `(room_id, location_id, organization_id)` REFERENCES `practice_rooms(id, location_id, organization_id)`
  - `(created_by_user_id, organization_id)` REFERENCES `users(id, organization_id)`

---

## Concurrence et Contraintes d'Exclusion PostgreSQL
L'extension `btree_gist` est activée dans la migration `0014`.
Trois contraintes d'exclusion protègent contre les doubles réservations concurrentes :
1. `appointments_practitioner_no_overlap` :
   `EXCLUDE USING gist (organization_id WITH =, practitioner_id WITH =, tstzrange(occupancy_starts_at, occupancy_ends_at, '[)') WITH &&) WHERE (status = 'scheduled')`
2. `appointments_patient_no_overlap` :
   `EXCLUDE USING gist (organization_id WITH =, patient_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = 'scheduled')`
3. `appointments_room_no_overlap` :
   `EXCLUDE USING gist (organization_id WITH =, room_id WITH =, tstzrange(occupancy_starts_at, occupancy_ends_at, '[)') WITH &&) WHERE (status = 'scheduled' AND room_id IS NOT NULL)`

Toute tentative concurrente de collision horaire déclenche l'erreur PostgreSQL `SQLSTATE 23P01`, que le service applicatif intercepte et transforme en `AppError(409, 'SCHEDULING_CONFLICT')`.

---

## Modèle Fuseau Horaire & Calculs
1. **Source de vérité** : chaque `practice_locations` possède son identifiant IANA (`Europe/Paris`).
2. **Entrée utilisateur** : `localDate (YYYY-MM-DD)` + `localStartTime (HH:mm)`.
3. **Conversion & Round-trip** : conversion en `UTC timestamptz` via `Intl.DateTimeFormat` et vérification bidirectionnelle exacte (rejet des heures inexistantes lors des transitions DST).
4. **Calculs automatiques serveur** :
   - `ends_at = starts_at + duration_minutes`
   - `occupancy_starts_at = starts_at - buffer_before_minutes`
   - `occupancy_ends_at = ends_at + buffer_after_minutes`
5. **Règle overnight** : rejet strict de tout rendez-vous traversant minuit local.

---

## Row Level Security (RLS) & Permissions
- RLS activée sur les 4 tables (`appointment_types`, `practitioner_availability_rules`, `practitioner_availability_exceptions`, `appointments`).
- Policy `USING` et `WITH CHECK` : tenant isolation + `public.users.profile_type = 'professional'` lié au compte connecté.
- Privilèges : `REVOKE ALL` pour `PUBLIC` et `anon`. `GRANT SELECT, INSERT, UPDATE` pour `authenticated`. Aucun `DELETE`.

---

## Interface Utilisateur & Navigation
- **Sidebar Paramedical** :
  - `Calendrier` : `/agenda/calendrier`
  - `Disponibilités` : `/agenda/disponibilites`
  - `Types de séances` : `/agenda/types-seances`
  - `Tâches` : `/agenda/taches`
- **Sidebar Generic** : conservée à `Calendrier` + `Tâches`.
- **Composants créés** :
  - `ParamedicalCalendar` : vue interactive Jour / Semaine / Mois, sélecteur de lieu avec fuseau horaire explicite, filtre praticien, grille interactive même à 0 rendez-vous.
  - `AppointmentForm` : recherche active de patients (projection minimale : nom civil, prénom, date de naissance), sélecteurs contrôlés, calculs automatiques de créneaux.
  - `AvailabilityManager` : gestion des plages hebdomadaires et exceptions ponctuelles (ouvertures / fermetures).
  - `AppointmentTypeManager` : configuration des types, durées, buffers et pas de créneaux.

---

## Validation des Tests & Qualité
- **Typescript** : 0 erreur (`npm run typecheck`).
- **Linter** : 0 erreur (`npm run lint`).
- **Zero Lying Cast** : 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any` sur l'ensemble du périmètre Session 09.
- **Unit Tests** :
  - `test:scheduling` (47 tests verts) : validation, availability, service, actions, agenda layout, calendar page.
  - `test:patients`, `test:practice-structure`, `test:dashboard`, `test:workspace`, `test:onboarding`, `test:security`, `test:unit`, `test:compliance` : 100% verts.
- **Integration Tests** :
  - `scheduling-db-constraints.integration.test.ts` : contraintes CHECK, FK composites, exclusion `23P01`, back-to-back, buffers.
  - `scheduling-rls.integration.test.ts` : Pro A, Pro B, cross-tenant isolation, Client A rejeté, Anon rejeté.
- **Build** : `next build` complété avec succès.

---

## Périmètre Hors Scope (Non implémenté en Session 09)
- Annulation / motif d'annulation (prévu en Session 10).
- No-show (prévu en Session 10).
- Liste d'attente (prévu ultérieurement).
- Notifications / SMS / Emails de rendez-vous.
- Réservation en ligne / Portail patient public.
- Réservation de ressources matérielles (`practice_resources`).
- Données médicales / cliniques / notes libres dans le rendez-vous.
- Facturation / paiement de séance.

---

## Supabase Production
- Migration `0014_wise_the_hunter.sql` : `NOT_APPLIED` en production.
- Aucune commande destructive exécutée sur Supabase production.

---

## Readiness Session 10
**NON — voir Session 09B**. Session 09B finalise les contrats de tests RLS/DB exhaustifs, la gestion des exceptions ouvertes pleine journée et la cohérence de snapshot de fuseau horaire.
