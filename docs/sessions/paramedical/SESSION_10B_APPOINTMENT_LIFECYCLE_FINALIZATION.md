# Session 10B — Appointment Lifecycle Finalization, DB State Machine Hardening & Waitlist Invariants

## 1. Résumé Exécutif

La Session 10B finalise et verrouille définitivement le cycle de vie des rendez-vous et la liste d'attente paramédicale suite à l'audit approfondi de la Session 10 :
1. **Verrouillage DB Inviolable contre le No-Show Futur (P0)** : La fonction trigger `enforce_appointment_status_transition()` vérifie désormais `OLD.starts_at <= now()` pour toute transition `scheduled -> no_show`. Cette vérification utilise `OLD.starts_at` comme autorité invariante et bloque toute tentative de contournement direct via Supabase/PostgREST par un utilisateur authentifié (`SQLSTATE 23514`).
2. **Immuabilité Structurelle lors des Transitions Terminales** : Lors du passage à `cancelled` ou `no_show`, le trigger compare l'ensemble des 14 colonnes structurelles (`id`, `organization_id`, `patient_id`, `practitioner_id`, `appointment_type_id`, `location_id`, `room_id`, `created_by_user_id`, `starts_at`, `ends_at`, `occupancy_starts_at`, `occupancy_ends_at`, `timezone`, `created_at`). Toute altération simultanée est rejetée avec `SQLSTATE 23514`.
3. **Prouvabilité Complète de la Libération de Créneau** : Des tests d'intégration PostgreSQL prouvent que lors de l'annulation ou du marquage absent d'un rendez-vous, l'ensemble des contraintes d'exclusion partielles (`WHERE status = 'scheduled'`) — praticien, patient et salle de consultation — libèrent instantanément et simultanément les créneaux pour de nouvelles réservations.
4. **Matrice Complète des Contraintes CHECK Waitlist & FKs Multi-Tenant** :
   - Vérification stricte des intervalles temporels (rejet de début seul, fin seule, début >= fin, dates inversées).
   - Machine à états waitlist (`waiting -> resolved`), interdiction d'insertion directe en `resolved` ou avec métadonnées de résolution, et immuabilité absolue des entrées résolues.
   - 6 FKs composites tenant-safe (`patient_id`, `appointment_type_id`, `location_id`, `practitioner_id/location_id`, `created_by_user_id`, `resolved_appointment_id`) testées et prouvées étanches contre les injections cross-tenant.
5. **Couverture de Tests d'Intégration et Unitaires Exhaustive** :
   - Tests d'intégration DB : 26 cas d'intégrité couvrant l'ensemble des contraintes, triggers, RLS bypass et libération de créneau.
   - Tests Server Actions : `cancelAppointmentAction`, `markAppointmentNoShowAction`, `createWaitlistEntryAction`, `updateWaitlistEntryAction`, `resolveWaitlistEntryAction` avec autorité de session, rejet d'injections client et guard workspace générique.
   - Tests Composants UI : `AppointmentDetailsModal` (états scheduled, cancelled, no-show, 6 motifs d'annulation, matching waitlist) et `WaitlistManager` (onglets, filtres lieu/praticien, modale de résolution).
6. **Durcissement des Scripts de Contrôle de Schéma** :
   - `scripts/check-schema-contract.ts` inspecte les prédicats `WHERE` réels de `pg_get_constraintdef` pour les 3 contraintes d'exclusion partielles.
   - `scripts/check-custom-objects.ts` inspecte la définition des triggers `pg_get_triggerdef` (`BEFORE INSERT OR UPDATE FOR EACH ROW`) et les invariants critiques de `pg_get_functiondef` (`no_show`, `OLD.starts_at`, `now()`, `23514`, colonnes structurelles).
7. **Politique Zero Lying Cast** : Exactement 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any` sur l'ensemble du périmètre modifié et des scripts associés.
8. **Inventaire Canonique des Migrations** : `0015_silly_whizzer.sql` mise à jour sur place (aucune migration `0016` créée, `0014_wise_the_hunter.sql` strictement préservée), classifiée `CANONICAL` / `NOT_APPLIED` pour la production Supabase.

---

## 2. Architecture & Sécurité Base de Données

### 2.1. Trigger `enforce_appointment_status_transition()`
```sql
CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Appointments must be inserted with status scheduled'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.cancellation_reason_code IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.no_show_at IS NOT NULL THEN
      RAISE EXCEPTION 'New appointments cannot contain cancellation or no_show metadata'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If already terminal, reject any update
    IF OLD.status IN ('cancelled', 'no_show') THEN
      RAISE EXCEPTION 'Terminal appointment status is immutable'
        USING ERRCODE = '23514';
    END IF;

    -- scheduled -> cancelled
    IF OLD.status = 'scheduled' AND NEW.status = 'cancelled' THEN
      -- Guard against structural mutation during terminal transition
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.appointment_type_id <> OLD.appointment_type_id
         OR NEW.location_id <> OLD.location_id
         OR NEW.room_id IS DISTINCT FROM OLD.room_id
         OR NEW.created_by_user_id <> OLD.created_by_user_id
         OR NEW.starts_at <> OLD.starts_at
         OR NEW.ends_at <> OLD.ends_at
         OR NEW.occupancy_starts_at <> OLD.occupancy_starts_at
         OR NEW.occupancy_ends_at <> OLD.occupancy_ends_at
         OR NEW.timezone <> OLD.timezone
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed during terminal status transition'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.cancellation_reason_code IS NULL THEN
        RAISE EXCEPTION 'Cancellation reason code is required when cancelling appointment'
          USING ERRCODE = '23514';
      END IF;
      NEW.cancelled_at := now();
      NEW.no_show_at := NULL;
      RETURN NEW;
    END IF;

    -- scheduled -> no_show
    IF OLD.status = 'scheduled' AND NEW.status = 'no_show' THEN
      -- P0 Invariant: OLD.starts_at must be in the past or current time
      IF OLD.starts_at > now() THEN
        RAISE EXCEPTION 'Cannot mark a future appointment as no_show'
          USING ERRCODE = '23514';
      END IF;

      -- Guard against structural mutation during terminal transition
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.appointment_type_id <> OLD.appointment_type_id
         OR NEW.location_id <> OLD.location_id
         OR NEW.room_id IS DISTINCT FROM OLD.room_id
         OR NEW.created_by_user_id <> OLD.created_by_user_id
         OR NEW.starts_at <> OLD.starts_at
         OR NEW.ends_at <> OLD.ends_at
         OR NEW.occupancy_starts_at <> OLD.occupancy_starts_at
         OR NEW.occupancy_ends_at <> OLD.occupancy_ends_at
         OR NEW.timezone <> OLD.timezone
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed during terminal status transition'
          USING ERRCODE = '23514';
      END IF;

      NEW.no_show_at := now();
      NEW.cancelled_at := NULL;
      NEW.cancellation_reason_code := NULL;
      RETURN NEW;
    END IF;

    -- scheduled -> scheduled (rescheduling, room/practitioner/type update)
    IF OLD.status = 'scheduled' AND NEW.status = 'scheduled' THEN
      IF NEW.cancellation_reason_code IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.no_show_at IS NOT NULL THEN
        RAISE EXCEPTION 'Scheduled appointments cannot contain cancellation or no_show metadata'
          USING ERRCODE = '23514';
      END IF;
      NEW.cancellation_reason_code := NULL;
      NEW.cancelled_at := NULL;
      NEW.no_show_at := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid appointment status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
```

### 2.2. Trigger `enforce_waitlist_status_transition()`
```sql
CREATE OR REPLACE FUNCTION public.enforce_waitlist_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'waiting' THEN
      RAISE EXCEPTION 'Waitlist entries must be inserted with status waiting'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.resolution_code IS NOT NULL OR NEW.resolved_at IS NOT NULL OR NEW.resolved_appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'New waitlist entries cannot contain resolution metadata'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If already resolved, reject any mutation
    IF OLD.status = 'resolved' THEN
      RAISE EXCEPTION 'Resolved waitlist entries are immutable'
        USING ERRCODE = '23514';
    END IF;

    -- waiting -> resolved
    IF OLD.status = 'waiting' AND NEW.status = 'resolved' THEN
      IF NEW.resolution_code IS NULL THEN
        RAISE EXCEPTION 'Resolution code is required when resolving waitlist entry'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.resolution_code = 'booked' AND NEW.resolved_appointment_id IS NULL THEN
        RAISE EXCEPTION 'Resolved appointment ID is required for booked resolution'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.resolution_code <> 'booked' AND NEW.resolved_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Resolved appointment ID must be null for non-booked resolution'
          USING ERRCODE = '23514';
      END IF;
      NEW.resolved_at := now();
      RETURN NEW;
    END IF;

    -- waiting -> waiting (update preferences)
    IF OLD.status = 'waiting' AND NEW.status = 'waiting' THEN
      IF NEW.resolution_code IS NOT NULL OR NEW.resolved_at IS NOT NULL OR NEW.resolved_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Active waiting entries cannot contain resolution metadata'
          USING ERRCODE = '23514';
      END IF;
      NEW.resolution_code := NULL;
      NEW.resolved_at := NULL;
      NEW.resolved_appointment_id := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid waitlist status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
```

---

## 3. Matrice des Vérifications et Tests

### 3.1. Tests d'Intégration DB (`tests/integration/appointment-lifecycle-db-constraints.integration.test.ts`)
- `P0: rejects marking future appointment as no_show with 23514`
- `P0: proves direct PostgREST authenticated professional UPDATE to future no_show is blocked by DB`
- `successfully transitions past scheduled -> no_show and sets no_show_at = now()`
- `successfully transitions scheduled -> cancelled and sets cancelled_at = now()`
- `rejects structural mutations during transition to cancelled with 23514`
- `rejects structural mutations during transition to no_show with 23514`
- `blocks mutating terminal cancelled appointment (cancelled -> scheduled, cancelled -> no_show, mutation) with 23514`
- `blocks mutating terminal no_show appointment (no_show -> scheduled, no_show -> cancelled, mutation) with 23514`
- `proves slot release on cancel: practitioner, patient and room exclusions all release slot`
- `proves slot release on no_show: practitioner, patient and room exclusions all release slot`
- `rejects invalid waitlist status with 23514`
- `rejects invalid resolution_code with 23514`
- `rejects one-null preferred time (start set, end null) with 23514`
- `rejects one-null preferred time (start null, end set) with 23514`
- `rejects reversed preferred times (start >= end) with 23514`
- `rejects invalid waitlist date interval (preferred_date_until < preferred_date_from) with 23514`
- `rejects waiting status with resolution metadata with 23514`
- `rejects direct INSERT with status = resolved with 23514 (state machine)`
- `successfully transitions waiting -> resolved (withdrawn) and sets resolved_at = now()`
- `blocks mutating terminal resolved waitlist entry (reopen or preference change) with 23514`
- `rejects waitlist entry with cross-tenant patient with 23503`
- `rejects waitlist entry with cross-tenant appointment_type with 23503`
- `rejects waitlist entry with cross-tenant location with 23503`
- `rejects waitlist entry with cross-tenant practitioner/location assignment with 23503`
- `rejects waitlist entry with cross-tenant created_by_user with 23503`
- `rejects waitlist resolution with cross-tenant resolved_appointment_id with 23503`

### 3.2. Tests Unitaires Applicatifs
- `tests/unit/scheduling/scheduling.service.test.ts` (23 tests) :
  - Tests d'erreur `FUTURE_NO_SHOW_FORBIDDEN` (400) et `APPOINTMENT_NOT_SCHEDULED` (409).
- `tests/unit/scheduling/actions.test.ts` (6 tests) :
  - `cancelAppointmentAction`, `markAppointmentNoShowAction`, `createWaitlistEntryAction`, `updateWaitlistEntryAction`, `resolveWaitlistEntryAction` avec autorité de session, rejet d'injection client d'`organizationId` et redirection pour les non-professionnels.
- `tests/unit/scheduling/appointment-details-modal.test.tsx` (5 tests) :
  - Rendu des statuts scheduled, cancelled, no-show, 6 motifs d'annulation canoniques et matching de liste d'attente.
- `tests/unit/scheduling/waitlist-manager.test.tsx` (3 tests) :
  - Onglets, filtrage lieu / praticien et modale de résolution.

---

## 4. Validation Zero Lying Cast

```bash
grep -R -nE "as any|as unknown as|as never|: any" \
  scripts/check-schema-contract.ts \
  scripts/check-custom-objects.ts \
  src/lib/services/scheduling.service.ts \
  tests/integration/appointment-lifecycle-db-constraints.integration.test.ts \
  tests/unit/scheduling/actions.test.ts \
  tests/unit/scheduling/scheduling.service.test.ts \
  tests/unit/scheduling/appointment-details-modal.test.tsx \
  tests/unit/scheduling/waitlist-manager.test.tsx
```
**Résultat** : **Exactement 0 occurrence**.

---

## 5. Inventaire Canonique des Migrations

| Migration | Statut Local | Statut Supabase Prod | Commentaire |
| :--- | :--- | :--- | :--- |
| `0000_fluffy_mysterio.sql` | `APPLIED` | `APPLIED` | Baseline multi-tenant initiale |
| ... | ... | ... | ... |
| `0014_wise_the_hunter.sql` | `APPLIED` | `NOT_APPLIED` | Fondations de planification paramédicale (Session 09/09B/09C) — inchangée |
| `0015_silly_whizzer.sql` | `APPLIED` | `NOT_APPLIED` | Cycle de vie des rendez-vous, liste d'attente, machine à états DB durcie (Session 10/10B) |
