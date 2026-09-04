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

describe('Scheduling Database Integrity & Exclusion Constraints', () => {
  let sql: postgres.Sql;

  const orgA = 'org-sched-test-a';
  const orgB = 'org-sched-test-b';

  const userA = 'user-sched-pro-a';
  const userB = 'user-sched-pro-b';

  const locA = 'loc-sched-test-a';
  const locB = 'loc-sched-test-b';

  const roomA = 'room-sched-test-a';
  const roomB = 'room-sched-test-b';

  const pracA = 'prac-sched-test-a';
  const pracB = 'prac-sched-test-b';

  const patientA = 'pat-sched-test-a';
  const patientB = 'pat-sched-test-b';

  const typeA = 'type-sched-test-a';
  const typeB = 'type-sched-test-b';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Setup Orgs
    await sql`INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${orgA}, 'Sched Org A', 'sched-org-a', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${orgB}, 'Sched Org B', 'sched-org-b', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Users
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userA}, 'proA@sched.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userB}, 'proB@sched.test', ${orgB}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Locations
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locA}, ${orgA}, 'Cabinet A', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locB}, ${orgB}, 'Cabinet B', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Rooms
    await sql`INSERT INTO practice_rooms (id, organization_id, location_id, name, created_at, updated_at) VALUES (${roomA}, ${orgA}, ${locA}, 'Salle A1', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_rooms (id, organization_id, location_id, name, created_at, updated_at) VALUES (${roomB}, ${orgB}, ${locB}, 'Salle B1', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioners
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA}, ${orgA}, ${userA}, 'Dr Pro A', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracB}, ${orgB}, ${userB}, 'Dr Pro B', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioner-Location assignments
    await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${pracA}, ${locA}, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgB}, ${pracB}, ${locB}, now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Patients
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patientA}, ${orgA}, 'MARTIN', 'Paul', '1985-03-20', 'male', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patientB}, ${orgB}, 'DURAND', 'Sophie', '1992-11-10', 'female', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Types
    await sql`INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, slot_step_minutes, created_at, updated_at) VALUES (${typeA}, ${orgA}, 'Séance Standard A', 30, 0, 0, 15, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, slot_step_minutes, created_at, updated_at) VALUES (${typeB}, ${orgB}, 'Séance Standard B', 30, 0, 0, 15, now(), now()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
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

  describe('Appointment Type Checks & Constraints', () => {
    it('rejects duration < 5 with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_types (id, organization_id, name, duration_minutes)
          VALUES (${randomUUID()}, ${orgA}, 'Trop court', 4)
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects negative buffer with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes)
          VALUES (${randomUUID()}, ${orgA}, 'Buffer negatif', 30, -5)
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects duplicate type name within same tenant with 23505', async () => {
      try {
        await sql`
          INSERT INTO appointment_types (id, organization_id, name, duration_minutes)
          VALUES (${randomUUID()}, ${orgA}, 'Séance Standard A', 45)
        `;
        expect.unreachable('Should have thrown unique constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23505');
      }
    });
  });

  describe('Availability Rules & Exceptions Checks', () => {
    it('rejects invalid weekday (7) with 23514', async () => {
      try {
        await sql`
          INSERT INTO practitioner_availability_rules (
            id, organization_id, practitioner_id, location_id, weekday, start_time, end_time, valid_from
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, ${locA}, 7, '09:00', '17:00', '2026-09-01'
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects start_time >= end_time with 23514', async () => {
      try {
        await sql`
          INSERT INTO practitioner_availability_rules (
            id, organization_id, practitioner_id, location_id, weekday, start_time, end_time, valid_from
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, ${locA}, 1, '17:00', '09:00', '2026-09-01'
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects valid_until < valid_from with 23514', async () => {
      try {
        await sql`
          INSERT INTO practitioner_availability_rules (
            id, organization_id, practitioner_id, location_id, weekday, start_time, end_time, valid_from, valid_until
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, ${locA}, 1, '09:00', '17:00', '2026-09-10', '2026-09-01'
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects invalid exception kind with 23514', async () => {
      try {
        await sql`
          INSERT INTO practitioner_availability_exceptions (
            id, organization_id, practitioner_id, location_id, local_date, kind
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, ${locA}, '2026-09-15', 'vacation'
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects exception with only one time set with 23514', async () => {
      try {
        await sql`
          INSERT INTO practitioner_availability_exceptions (
            id, organization_id, practitioner_id, location_id, local_date, kind, start_time
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, ${locA}, '2026-09-15', 'closed', '09:00'
          )
        `;
        expect.unreachable('Should have thrown check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });
  });

  describe('Composite Foreign Key Cross-Tenant & Mismatch Protections', () => {
    it('rejects Rule with Practitioner and Location from different tenants with 23503', async () => {
      try {
        await sql`
          INSERT INTO practitioner_availability_rules (
            id, organization_id, practitioner_id, location_id, weekday, start_time, end_time, valid_from
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, ${locB}, 1, '09:00', '17:00', '2026-09-01'
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('rejects Appointment Org A with Patient B with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientB}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-09-10T08:00:00Z', '2026-09-10T08:30:00Z', '2026-09-10T08:00:00Z', '2026-09-10T08:30:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('rejects Appointment Org A with Practitioner B with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${pracB}, ${typeA}, ${locA}, ${userA},
            '2026-09-10T08:00:00Z', '2026-09-10T08:30:00Z', '2026-09-10T08:00:00Z', '2026-09-10T08:30:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('rejects Appointment Room B with Location A with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomB}, ${userA},
            '2026-09-10T08:00:00Z', '2026-09-10T08:30:00Z', '2026-09-10T08:00:00Z', '2026-09-10T08:30:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });
  });

  describe('PostgreSQL Exclusion Constraints & Overlap Prevention (23P01)', () => {
    it('double-booking Practitioner throws SQLSTATE 23P01', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-09-10T09:00:00Z', '2026-09-10T09:30:00Z', '2026-09-10T09:00:00Z', '2026-09-10T09:30:00Z', 'Europe/Paris'
        )
      `;

      try {
        // Same practitioner, overlapping slot [09:15, 09:45)
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-09-10T09:15:00Z', '2026-09-10T09:45:00Z', '2026-09-10T09:15:00Z', '2026-09-10T09:45:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown 23P01 exclusion constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23P01');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${appt1Id}`;
      }
    });

    it('double-booking Patient throws SQLSTATE 23P01', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      // Create a 2nd practitioner in Org A for this test
      const pracA2 = 'prac-sched-test-a2';
      const userA2 = 'user-sched-pro-a2';
      await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userA2}, 'proA2@sched.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
      await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA2}, ${orgA}, ${userA2}, 'Dr Pro A2', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
      await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${pracA2}, ${locA}, now(), now()) ON CONFLICT DO NOTHING`;

      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-09-10T10:00:00Z', '2026-09-10T10:30:00Z', '2026-09-10T10:00:00Z', '2026-09-10T10:30:00Z', 'Europe/Paris'
        )
      `;

      try {
        // Different practitioner pracA2, same patient, overlapping time [10:15, 10:45)
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patientA}, ${pracA2}, ${typeA}, ${locA}, ${userA},
            '2026-09-10T10:15:00Z', '2026-09-10T10:45:00Z', '2026-09-10T10:15:00Z', '2026-09-10T10:45:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown 23P01 exclusion constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23P01');
      } finally {
        await sql`DELETE FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
        await sql`DELETE FROM practitioner_locations WHERE practitioner_id = ${pracA2}`;
        await sql`DELETE FROM practice_practitioners WHERE id = ${pracA2}`;
        await sql`DELETE FROM users WHERE id = ${userA2}`;
      }
    });

    it('double-booking Room throws SQLSTATE 23P01', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      // Create 2nd practitioner and 2nd patient in Org A
      const pracA2 = 'prac-sched-test-a3';
      const userA2 = 'user-sched-pro-a3';
      const patA2 = 'pat-sched-test-a2';
      await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userA2}, 'proA3@sched.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
      await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA2}, ${orgA}, ${userA2}, 'Dr Pro A3', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
      await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${pracA2}, ${locA}, now(), now()) ON CONFLICT DO NOTHING`;
      await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patA2}, ${orgA}, 'LECLERC', 'Claire', '1995-07-12', 'female', now(), now()) ON CONFLICT DO NOTHING`;

      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
          '2026-09-10T11:00:00Z', '2026-09-10T11:30:00Z', '2026-09-10T11:00:00Z', '2026-09-10T11:30:00Z', 'Europe/Paris'
        )
      `;

      try {
        // Different practitioner and patient, but same roomA overlapping
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patA2}, ${pracA2}, ${typeA}, ${locA}, ${roomA}, ${userA},
            '2026-09-10T11:15:00Z', '2026-09-10T11:45:00Z', '2026-09-10T11:15:00Z', '2026-09-10T11:45:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown 23P01 exclusion constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23P01');
      } finally {
        await sql`DELETE FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
        await sql`DELETE FROM patient_profiles WHERE id = ${patA2}`;
        await sql`DELETE FROM practitioner_locations WHERE practitioner_id = ${pracA2}`;
        await sql`DELETE FROM practice_practitioners WHERE id = ${pracA2}`;
        await sql`DELETE FROM users WHERE id = ${userA2}`;
      }
    });

    it('accepts contiguous back-to-back appointments ([09:00, 09:30) and [09:30, 10:00))', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-09-10T14:00:00Z', '2026-09-10T14:30:00Z', '2026-09-10T14:00:00Z', '2026-09-10T14:30:00Z', 'Europe/Paris'
        )
      `;

      // Next appointment starts exactly at 14:30
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
        ) VALUES (
          ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-09-10T14:30:00Z', '2026-09-10T15:00:00Z', '2026-09-10T14:30:00Z', '2026-09-10T15:00:00Z', 'Europe/Paris'
        )
      `;

      // Both succeeded
      const check = await sql`SELECT count(*) as cnt FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
      expect(Number(check[0]?.cnt)).toBe(2);

      await sql`DELETE FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
    });

    it('buffer conflict: 30 min duration with 15 min buffer after blocks practitioner occupancy until 09:45', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      // Appt 1: starts 09:00, ends 09:30, buffer after 15m -> occupancy [09:00, 09:45)
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          '2026-09-10T09:00:00Z', '2026-09-10T09:30:00Z', '2026-09-10T09:00:00Z', '2026-09-10T09:45:00Z', 'Europe/Paris'
        )
      `;

      try {
        // Appt 2: practitioner tries to start at 09:35 -> occupancy [09:35, 10:05) -> overlaps [09:00, 09:45)
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            '2026-09-10T09:35:00Z', '2026-09-10T10:05:00Z', '2026-09-10T09:35:00Z', '2026-09-10T10:05:00Z', 'Europe/Paris'
          )
        `;
        expect.unreachable('Should have thrown 23P01 due to buffer overlap');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23P01');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${appt1Id}`;
      }
    });
  });
});
