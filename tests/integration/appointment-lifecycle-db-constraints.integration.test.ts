import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

function hasPostgresErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof Reflect.get(error, 'code') === 'string'
  );
}

describe('Appointment Lifecycle & Waitlist Database Integrity (Session 10)', () => {
  let sql: postgres.Sql;

  const orgA = 'org-life-test-a';
  const orgB = 'org-life-test-b';

  const userA = 'user-life-pro-a';
  const userB = 'user-life-pro-b';

  const locA = 'loc-life-test-a';
  const locB = 'loc-life-test-b';

  const roomA = 'room-life-test-a';
  const roomB = 'room-life-test-b';

  const pracA = 'prac-life-test-a';
  const pracB = 'prac-life-test-b';

  const patientA = 'pat-life-test-a';
  const patientB = 'pat-life-test-b';

  const typeA = 'type-life-test-a';
  const typeB = 'type-life-test-b';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Setup Orgs
    await sql`INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${orgA}, 'Lifecycle Org A', 'life-org-a', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${orgB}, 'Lifecycle Org B', 'life-org-b', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Users
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userA}, 'proA@life.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userB}, 'proB@life.test', ${orgB}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Locations
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locA}, ${orgA}, 'Cabinet Lifecycle A', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locB}, ${orgB}, 'Cabinet Lifecycle B', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Rooms
    await sql`INSERT INTO practice_rooms (id, organization_id, location_id, name, created_at, updated_at) VALUES (${roomA}, ${orgA}, ${locA}, 'Salle L1', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_rooms (id, organization_id, location_id, name, created_at, updated_at) VALUES (${roomB}, ${orgB}, ${locB}, 'Salle L2', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioners
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA}, ${orgA}, ${userA}, 'Dr Life A', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracB}, ${orgB}, ${userB}, 'Dr Life B', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioner-Location assignments
    await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${pracA}, ${locA}, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgB}, ${pracB}, ${locB}, now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Patients
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patientA}, ${orgA}, 'LIFE_PAT_A', 'Jean', '1988-04-12', 'male', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patientB}, ${orgB}, 'LIFE_PAT_B', 'Emma', '1991-09-22', 'female', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Types
    await sql`INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, slot_step_minutes, created_at, updated_at) VALUES (${typeA}, ${orgA}, 'Type Life A', 30, 0, 0, 15, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, slot_step_minutes, created_at, updated_at) VALUES (${typeB}, ${orgB}, 'Type Life B', 30, 0, 0, 15, now(), now()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    await sql`DELETE FROM appointment_waitlist_entries WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM appointments WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practitioner_availability_exceptions WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practitioner_availability_rules WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM appointment_types WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_profiles WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practitioner_locations WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_practitioners WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_rooms WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_locations WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql.end();
  });

  describe('Appointment Lifecycle Constraints & State Machine Trigger', () => {
    it('rejects invalid appointment status with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', 'Europe/Paris', 'pending'
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects direct INSERT with status = cancelled with 23514 (state machine)', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status, cancellation_reason_code
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', 'Europe/Paris',
            'cancelled', 'patient_request'
          )
        `;
        expect.unreachable('Should have thrown 23514 state transition violation on direct terminal insert');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects direct INSERT with status = no_show with 23514 (state machine)', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', 'Europe/Paris',
            'no_show'
          )
        `;
        expect.unreachable('Should have thrown 23514 state transition violation on direct terminal insert');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects cancellation without cancellation_reason_code with 23514', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', '2026-10-10T09:00:00Z', '2026-10-10T09:30:00Z', 'Europe/Paris',
          'scheduled'
        )
      `;

      try {
        await sql`
          UPDATE appointments
          SET status = 'cancelled'
          WHERE id = ${apptId}
        `;
        expect.unreachable('Should have thrown 23514 for missing reason code');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    it('successfully transitions scheduled -> cancelled and sets cancelled_at = now()', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-10-10T10:00:00Z', '2026-10-10T10:30:00Z', '2026-10-10T10:00:00Z', '2026-10-10T10:30:00Z', 'Europe/Paris',
          'scheduled'
        )
      `;

      await sql`
        UPDATE appointments
        SET status = 'cancelled', cancellation_reason_code = 'patient_request'
        WHERE id = ${apptId}
      `;

      const rows = await sql`SELECT status, cancellation_reason_code, cancelled_at, no_show_at FROM appointments WHERE id = ${apptId}`;
      expect(rows[0]?.status).toBe('cancelled');
      expect(rows[0]?.cancellation_reason_code).toBe('patient_request');
      expect(rows[0]?.cancelled_at).not.toBeNull();
      expect(rows[0]?.no_show_at).toBeNull();

      await sql`DELETE FROM appointments WHERE id = ${apptId}`;
    });

    it('successfully transitions scheduled -> no_show and sets no_show_at = now()', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-10-10T11:00:00Z', '2026-10-10T11:30:00Z', '2026-10-10T11:00:00Z', '2026-10-10T11:30:00Z', 'Europe/Paris',
          'scheduled'
        )
      `;

      await sql`
        UPDATE appointments
        SET status = 'no_show'
        WHERE id = ${apptId}
      `;

      const rows = await sql`SELECT status, cancellation_reason_code, cancelled_at, no_show_at FROM appointments WHERE id = ${apptId}`;
      expect(rows[0]?.status).toBe('no_show');
      expect(rows[0]?.cancellation_reason_code).toBeNull();
      expect(rows[0]?.no_show_at).not.toBeNull();
      expect(rows[0]?.cancelled_at).toBeNull();

      await sql`DELETE FROM appointments WHERE id = ${apptId}`;
    });

    it('blocks mutating terminal cancelled appointment with 23514 (immutability)', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-10-10T12:00:00Z', '2026-10-10T12:30:00Z', '2026-10-10T12:00:00Z', '2026-10-10T12:30:00Z', 'Europe/Paris',
          'scheduled'
        )
      `;

      await sql`
        UPDATE appointments
        SET status = 'cancelled', cancellation_reason_code = 'practitioner_request'
        WHERE id = ${apptId}
      `;

      // Try reopening
      try {
        await sql`
          UPDATE appointments
          SET status = 'scheduled'
          WHERE id = ${apptId}
        `;
        expect.unreachable('Should have thrown 23514 on attempting to reopen cancelled appointment');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }

      // Try modifying notes/room on cancelled appointment
      try {
        await sql`
          UPDATE appointments
          SET room_id = ${roomA}
          WHERE id = ${apptId}
        `;
        expect.unreachable('Should have thrown 23514 on attempting to modify cancelled appointment');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    it('proves immediate slot release: cancel releases slot for new scheduled appointment', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      // Step 1: Book 14:00 - 14:30
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-10-10T14:00:00Z', '2026-10-10T14:30:00Z', '2026-10-10T14:00:00Z', '2026-10-10T14:30:00Z', 'Europe/Paris',
          'scheduled'
        )
      `;

      // Step 2: Attempting to double-book same slot throws 23P01
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-10-10T14:00:00Z', '2026-10-10T14:30:00Z', '2026-10-10T14:00:00Z', '2026-10-10T14:30:00Z', 'Europe/Paris',
            'scheduled'
          )
        `;
        expect.unreachable('Should have thrown 23P01');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23P01');
      }

      // Step 3: Cancel Appt 1
      await sql`
        UPDATE appointments
        SET status = 'cancelled', cancellation_reason_code = 'patient_request'
        WHERE id = ${appt1Id}
      `;

      // Step 4: Now booking the exact same slot succeeds!
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-10-10T14:00:00Z', '2026-10-10T14:30:00Z', '2026-10-10T14:00:00Z', '2026-10-10T14:30:00Z', 'Europe/Paris',
          'scheduled'
        )
      `;

      const check = await sql`SELECT count(*) as cnt FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
      expect(Number(check[0]?.cnt)).toBe(2);

      await sql`DELETE FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
    });
  });

  describe('Waitlist Checks, Composite FKs & State Machine Trigger', () => {
    it('rejects invalid waitlist date interval (preferred_date_until < preferred_date_from) with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, preferred_date_until, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', '2026-10-10', 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects direct INSERT with status = resolved with 23514 (state machine)', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, resolution_code, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-01', 'Europe/Paris', 'resolved', 'withdrawn', ${userA}
          )
        `;
        expect.unreachable('Should have thrown 23514 on direct terminal resolved insert');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects waitlist entry with cross-tenant patient with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientB}, ${typeA}, ${locA}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('rejects waitlist entry with cross-tenant location with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locB}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('rejects waitlist entry with cross-tenant practitioner with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, practitioner_id, preferred_date_from, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, ${pracB}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('successfully transitions waiting -> resolved and sets resolved_at = now()', async () => {
      const entryId = randomUUID();
      await sql`
        INSERT INTO appointment_waitlist_entries (
          id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
        ) VALUES (
          ${entryId}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
        )
      `;

      await sql`
        UPDATE appointment_waitlist_entries
        SET status = 'resolved', resolution_code = 'withdrawn'
        WHERE id = ${entryId}
      `;

      const rows = await sql`SELECT status, resolution_code, resolved_at FROM appointment_waitlist_entries WHERE id = ${entryId}`;
      expect(rows[0]?.status).toBe('resolved');
      expect(rows[0]?.resolution_code).toBe('withdrawn');
      expect(rows[0]?.resolved_at).not.toBeNull();

      await sql`DELETE FROM appointment_waitlist_entries WHERE id = ${entryId}`;
    });

    it('blocks mutating terminal resolved waitlist entry with 23514 (immutability)', async () => {
      const entryId = randomUUID();
      await sql`
        INSERT INTO appointment_waitlist_entries (
          id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
        ) VALUES (
          ${entryId}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
        )
      `;

      await sql`
        UPDATE appointment_waitlist_entries
        SET status = 'resolved', resolution_code = 'not_needed'
        WHERE id = ${entryId}
      `;

      // Try reopening
      try {
        await sql`
          UPDATE appointment_waitlist_entries
          SET status = 'waiting'
          WHERE id = ${entryId}
        `;
        expect.unreachable('Should have thrown 23514 on attempting to reopen waitlist entry');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }

      // Try modifying fields
      try {
        await sql`
          UPDATE appointment_waitlist_entries
          SET preferred_date_from = '2026-11-01'
          WHERE id = ${entryId}
        `;
        expect.unreachable('Should have thrown 23514 on attempting to modify resolved waitlist entry');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointment_waitlist_entries WHERE id = ${entryId}`;
      }
    });
  });
});
