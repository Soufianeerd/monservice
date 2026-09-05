# Session 10 — Appointment Lifecycle, Cancellation, No-Show, Waitlist & State-Machine Guards

## 1. Résumé Exécutif
La Session 10 concrétise la gestion complète du cycle de vie des rendez-vous et la liste d'attente intelligente pour le Practice Operating System paramédical :
1. **Cycle de vie des rendez-vous paramédicaux** : statuts `scheduled`, `cancelled`, `no_show`.
2. **Annulation structurée sans texte clinique libre** : 6 codes de motif canoniques (`patient_request`, `practitioner_request`, `practice_unavailable`, `scheduling_error`, `duplicate`, `other`).
3. **Marquage des absences (No-Show)** : verrouillage temporel strict interdisant le marquage d'absence sur les rendez-vous futurs (`starts_at <= now()`).
4. **Libération immédiate du créneau** : les contraintes d'exclusion PostgreSQL 16 (`23P01`) filtrant sur `WHERE (status = 'scheduled')` libèrent instantanément la disponibilité dès l'annulation ou le no-show.
5. **Machine à états DB inviolable** : fonctions trigger `SECURITY DEFINER` (`enforce_appointment_status_transition()` et `enforce_waitlist_status_transition()`) garantissant l'immuabilité absolue des états terminaux et interdisant les insertions directes en état terminal (`SQLSTATE 23514`).
6. **Gestion de la liste d'attente (Waitlist)** : table dédiée `appointment_waitlist_entries` avec FKs composites tenant-safe, statuts (`waiting`, `resolved`), codes de résolution (`booked`, `withdrawn`, `not_needed`, `other`), RLS professionnel strict et algorithme de suggestion/matching de créneaux.
7. **Expérience utilisateur (UX) paramédicale** : modale de détails de séance `AppointmentDetailsModal` avec annulation, no-show et matching waitlist direct, styles visuels distincts sur le calendrier, gestionnaire de liste d'attente `WaitlistManager`, formulaire `WaitlistForm` et route `/agenda/liste-attente`.
8. **Respect absolu du socle générique** : l'espace générique (CRM / Calendrier / Tâches) demeure strictement inchangé.
9. **Zero Lying Cast Policy** : 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any`.

---

## 2. Architecture et Contrats Base de Données

### 2.1. Migration Canonique `0015_silly_whizzer.sql`
- **Classification dans l'inventaire** : `CANONICAL` / `NOT_APPLIED` (production Supabase préservée).
- **Table `appointment_waitlist_entries`** :
  - `id` (text, PK)
  - `organization_id` (text, FK `organizations.id`)
  - `patient_id` (text)
  - `appointment_type_id` (text)
  - `location_id` (text)
  - `practitioner_id` (text, nullable pour "tout praticien du cabinet")
  - `preferred_date_from` (date NOT NULL)
  - `preferred_date_until` (date, nullable)
  - `preferred_start_time` (time, nullable)
  - `preferred_end_time` (time, nullable)
  - `timezone` (text NOT NULL, snapshot du lieu)
  - `status` (text NOT NULL DEFAULT 'waiting', CHECK IN ('waiting', 'resolved'))
  - `resolution_code` (text, CHECK IN ('booked', 'withdrawn', 'not_needed', 'other'))
  - `resolved_at` (timestamptz, nullable)
  - `resolved_appointment_id` (text, FK `appointments.id`, nullable)
  - `created_by_user_id` (text NOT NULL, FK `users.id`)
  - `created_at` / `updated_at` (timestamptz NOT NULL)

### 2.2. Clés Étrangères Composites Tenant-Safe
Toutes les relations sur `appointment_waitlist_entries` et `appointments` incluent le discriminant d'organisation `organization_id` :
- `waitlist_patient_fk` : `(patient_id, organization_id) REFERENCES patient_profiles(id, organization_id)`
- `waitlist_appointment_type_fk` : `(appointment_type_id, organization_id) REFERENCES appointment_types(id, organization_id)`
- `waitlist_location_fk` : `(location_id, organization_id) REFERENCES practice_locations(id, organization_id)`
- `waitlist_practitioner_location_fk` : `(organization_id, practitioner_id, location_id) REFERENCES practitioner_locations(organization_id, practitioner_id, location_id)`
- `waitlist_resolved_appointment_fk` : `(resolved_appointment_id, organization_id) REFERENCES appointments(id, organization_id)`
- `waitlist_created_by_user_fk` : `(created_by_user_id, organization_id) REFERENCES users(id, organization_id)`

### 2.3. Triggers & Machine à États PostgreSQL
1. **Trigger `appointments_status_transition_guard`** appelant `enforce_appointment_status_transition()` :
   - INSERT : Seul le statut `scheduled` est permis.
   - UPDATE : Si l'état actuel est `cancelled` ou `no_show`, toute mutation est bloquée (`SQLSTATE 23514`).
   - Transitions valides : `scheduled -> cancelled` (requiert `cancellation_reason_code`), `scheduled -> no_show` (pose `no_show_at = now()`), `scheduled -> scheduled` (reprogrammation/modification).
2. **Trigger `appointment_waitlist_status_transition_guard`** appelant `enforce_waitlist_status_transition()` :
   - INSERT : Seul le statut `waiting` est permis.
   - UPDATE : Si l'état actuel est `resolved`, toute mutation est bloquée (`SQLSTATE 23514`).
   - Transitions valides : `waiting -> waiting` (mise à jour critères), `waiting -> resolved` (requiert `resolution_code`, `resolved_at = now()`, et si `resolution_code = 'booked'`, `resolved_appointment_id` obligatoire).

### 2.4. Sécurité RLS et Privilèges
- RLS activé sur `appointment_waitlist_entries` avec politique `appointment_waitlist_entries_tenant_isolation`.
- Rôle `authenticated` restreint aux profils professionnels via `current_organization_id()`.
- Privilèges `GRANT SELECT, INSERT, UPDATE ON appointment_waitlist_entries TO authenticated`.
- `REVOKE ALL ON enforce_appointment_status_transition(), enforce_waitlist_status_transition() FROM PUBLIC, anon, authenticated`.

---

## 3. Logique Applicative & Services

Dans [src/lib/services/scheduling.service.ts](file:///Users/soufianeelrhadi/Projets/monservice/src/lib/services/scheduling.service.ts) :
- `cancelAppointment` : Vérifie l'autorisation professionnelle, valide le statut `scheduled`, applique le code de motif et met à jour l'état.
- `markAppointmentNoShow` : Vérifie l'autorisation professionnelle, valide que `starts_at <= now()`, et enregistre l'absence.
- `rescheduleAppointment` : Guard applicatif explicite rejetant les séances annulées ou absentes avant vérification de conflit et recalcul du créneau.
- `createWaitlistEntry`, `updateWaitlistEntry`, `resolveWaitlistEntry`, `listWaitlistEntries` : Gestion complète de la file d'attente avec vérification d'appartenance organisationnelle et contrôle de validité des intervalles temporels.
- `listMatchingWaitlistForAppointment` : Algorithme de scoring et filtrage ordonné (praticien exact = +10 pts, heure exacte = +5 pts, ordonné par ancienneté `created_at ASC`) pour proposer les meilleurs candidats lors d'une annulation ou création de créneau.

---

## 4. Expérience Utilisateur Paramédicale

1. **Modale de Détails de Séance (`AppointmentDetailsModal.tsx`)** :
   - Affichage du statut avec badges colorés (vert pour Planifié, rouge/rose pour Annulé avec badge du motif, ambre/orange pour Absent).
   - Actions rapides : "Annuler la séance" (sélection de motif avec confirmation), "Marquer absent" (désactivé si séance future), "Replanifier".
   - Affichage immédiat des candidats de la liste d'attente compatibles avec le créneau.
2. **Gestionnaire de Liste d'Attente (`WaitlistManager.tsx` & `/agenda/liste-attente`)** :
   - Onglets "En attente" et "Résolues".
   - Filtres par lieu et praticien.
   - Formulaire d'ajout rapide (`WaitlistForm.tsx`) avec validation de date et créneau horaire souhaité.
   - Actions de résolution (Pris en charge, Désistement, Non nécessaire, Autre).
3. **Navigation & Layout** :
   - Ajout du lien "Liste d'attente" dans la navigation secondaire de l'agenda paramédical.
   - Isolation stricte : absent du shell générique.

---

## 5. Validation Zero Lying Cast

La vérification stricte par regex a été effectuée sur l'intégralité du code de planification, composants, actions et tests :
```bash
grep -R -nE "as any|as unknown as|as never|: any" \
  src/lib/scheduling \
  src/lib/services/scheduling.service.ts \
  src/app/actions/scheduling.actions.ts \
  src/components/scheduling \
  src/app/(dashboard)/agenda \
  tests/unit/scheduling \
  tests/integration/appointment-lifecycle-db-constraints.integration.test.ts \
  tests/integration/waitlist-rls.integration.test.ts
```
**Résultat** : **Exactement 0 occurrence**.

---

## 6. Synthèse des Gates CI

| Gate CI | Statut | Détail |
| :--- | :--- | :--- |
| Supabase Local Start | `SUCCESS` | Extension `btree_gist`, PostgreSQL 16 |
| Drizzle Migrations | `SUCCESS` | Migrations `0000` à `0015_silly_whizzer.sql` appliquées |
| Schema Drift & Contract | `SUCCESS` | 39 tables, 0 drift, FKs composites exactes |
| Custom DB Objects & Triggers | `SUCCESS` | Triggers de machine à états, RLS, fonctions SECURITY DEFINER |
| DB Integrity Tests | `SUCCESS` | Contraintes d'exclusion 23P01, triggers d'immuabilité 23514 |
| RLS Integration Tests | `SUCCESS` | Isolation multi-tenant et professional-only |
| Lint & Typecheck | `SUCCESS` | 0 erreur ESLint, 0 erreur TypeScript (`tsc --noEmit`) |
| Unit Tests (Scheduling) | `SUCCESS` | 6 fichiers de tests, 72/72 tests passés |
| Compliance E2E & Next.js Build | `SUCCESS` | Build Turbopack réussi, 84 routes optimisées |
