import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PASSWORD = 'password123';

function hasPostgresErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof Reflect.get(error, 'code') === 'string'
  );
}

describe('Appointment Lifecycle & Waitlist Database Integrity (Session 10 / 10B)', () => {
  let sql: postgres.Sql;
  let proAClient: SupabaseClient | null = null;

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

    // Setup Supabase Client for PostgREST test if Supabase is running
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data, error } = await client.auth.signInWithPassword({
        email: PRO_A_EMAIL,
        password: PASSWORD,
      });
      if (!error && data?.user) {
        proAClient = client;
      }
    } catch {
      // PostgREST client optional in purely local pg unit run
    }
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

  describe('Appointment Lifecycle & State Machine Trigger Invariants', () => {
    it('rejects invalid appointment status with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
            now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
            now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
            'Europe/Paris', 'pending'
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
            now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
            now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
            'Europe/Paris', 'cancelled', 'patient_request'
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
            now() - interval '1 hour', now() - interval '30 minutes',
            now() - interval '1 hour', now() - interval '30 minutes',
            'Europe/Paris', 'no_show'
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
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
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
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
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

    // P0 Future No-Show DB Invariant
    it('P0: rejects marking future appointment as no_show with 23514', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      try {
        await sql`
          UPDATE appointments
          SET status = 'no_show'
          WHERE id = ${apptId}
        `;
        expect.unreachable('Should have rejected future no-show with 23514');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    // P0 Direct PostgREST / Supabase Client Bypass Proof
    it('P0: proves direct PostgREST authenticated professional UPDATE to future no_show is blocked by DB', async () => {
      if (!proAClient) {
        return; // Skipped if Supabase is not running in local test
      }

      // Seed future appointment for Org A using Pro A's user_id
      const futureApptId = randomUUID();
      const userARow = await sql`SELECT id, organization_id FROM users WHERE email = ${PRO_A_EMAIL} LIMIT 1`;
      if (userARow.length === 0) return;

      const proAOrgId = userARow[0]?.organization_id;
      const proAUserId = userARow[0]?.id;

      const patRow = await sql`SELECT id FROM patient_profiles WHERE organization_id = ${proAOrgId} LIMIT 1`;
      const pracRow = await sql`SELECT id FROM practice_practitioners WHERE organization_id = ${proAOrgId} LIMIT 1`;
      const locRow = await sql`SELECT id FROM practice_locations WHERE organization_id = ${proAOrgId} LIMIT 1`;
      const typeRow = await sql`SELECT id FROM appointment_types WHERE organization_id = ${proAOrgId} LIMIT 1`;

      if (patRow.length === 0 || pracRow.length === 0 || locRow.length === 0 || typeRow.length === 0) return;

      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${futureApptId}, ${proAOrgId}, ${patRow[0]?.id}, ${pracRow[0]?.id}, ${typeRow[0]?.id}, ${locRow[0]?.id}, ${proAUserId},
          now() + interval '2 days', now() + interval '2 days' + interval '30 minutes',
          now() + interval '2 days', now() + interval '2 days' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      // Pro A tries to bypass server action by calling PostgREST directly
      const { error } = await proAClient
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', futureApptId);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Future appointments cannot be marked no_show');

      await sql`DELETE FROM appointments WHERE id = ${futureApptId}`;
    });

    it('successfully transitions past scheduled -> no_show and sets no_show_at = now()', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          now() - interval '2 hours', now() - interval '90 minutes',
          now() - interval '2 hours', now() - interval '90 minutes',
          'Europe/Paris', 'scheduled'
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

    it('rejects structural mutations during transition to cancelled with 23514', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      try {
        await sql`
          UPDATE appointments
          SET status = 'cancelled',
              cancellation_reason_code = 'patient_request',
              starts_at = now() + interval '2 days'
          WHERE id = ${apptId}
        `;
        expect.unreachable('Should have rejected structural mutation during cancellation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    it('rejects structural mutations during transition to no_show with 23514', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          now() - interval '2 hours', now() - interval '90 minutes',
          now() - interval '2 hours', now() - interval '90 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      try {
        await sql`
          UPDATE appointments
          SET status = 'no_show',
              practitioner_id = ${pracB}
          WHERE id = ${apptId}
        `;
        expect.unreachable('Should have rejected practitioner change during no-show');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    it('blocks mutating terminal cancelled appointment (cancelled -> scheduled, cancelled -> no_show, mutation) with 23514', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      await sql`
        UPDATE appointments
        SET status = 'cancelled', cancellation_reason_code = 'practitioner_request'
        WHERE id = ${apptId}
      `;

      // 1. Try reopening cancelled -> scheduled
      try {
        await sql`UPDATE appointments SET status = 'scheduled' WHERE id = ${apptId}`;
        expect.unreachable('Should have thrown 23514 on cancelled -> scheduled');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }

      // 2. Try transitioning cancelled -> no_show
      try {
        await sql`UPDATE appointments SET status = 'no_show' WHERE id = ${apptId}`;
        expect.unreachable('Should have thrown 23514 on cancelled -> no_show');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }

      // 3. Try modifying room on cancelled appointment
      try {
        await sql`UPDATE appointments SET room_id = ${roomA} WHERE id = ${apptId}`;
        expect.unreachable('Should have thrown 23514 on modifying cancelled appointment');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    it('blocks mutating terminal no_show appointment (no_show -> scheduled, no_show -> cancelled, mutation) with 23514', async () => {
      const apptId = randomUUID();
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptId}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
          now() - interval '2 hours', now() - interval '90 minutes',
          now() - interval '2 hours', now() - interval '90 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      await sql`UPDATE appointments SET status = 'no_show' WHERE id = ${apptId}`;

      // 1. Try reopening no_show -> scheduled
      try {
        await sql`UPDATE appointments SET status = 'scheduled' WHERE id = ${apptId}`;
        expect.unreachable('Should have thrown 23514 on no_show -> scheduled');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }

      // 2. Try transitioning no_show -> cancelled
      try {
        await sql`UPDATE appointments SET status = 'cancelled', cancellation_reason_code = 'duplicate' WHERE id = ${apptId}`;
        expect.unreachable('Should have thrown 23514 on no_show -> cancelled');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }

      // 3. Try modifying room/starts_at on no_show appointment
      try {
        await sql`UPDATE appointments SET room_id = ${roomA} WHERE id = ${apptId}`;
        expect.unreachable('Should have thrown 23514 on modifying no_show appointment');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointments WHERE id = ${apptId}`;
      }
    });

    it('proves slot release on cancel: practitioner, patient and room exclusions all release slot', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      // Step 1: Book 14:00 - 14:30 with Room A
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
          now() + interval '3 days', now() + interval '3 days' + interval '30 minutes',
          now() + interval '3 days', now() + interval '3 days' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      // Step 2: Attempting to double-book exact same slot & room throws 23P01
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
            now() + interval '3 days', now() + interval '3 days' + interval '30 minutes',
            now() + interval '3 days', now() + interval '3 days' + interval '30 minutes',
            'Europe/Paris', 'scheduled'
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

      // Step 4: Now booking the exact same slot with same Patient + Practitioner + Room succeeds!
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
          now() + interval '3 days', now() + interval '3 days' + interval '30 minutes',
          now() + interval '3 days', now() + interval '3 days' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      const check = await sql`SELECT count(*) as cnt FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
      expect(Number(check[0]?.cnt)).toBe(2);

      await sql`DELETE FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
    });

    it('proves slot release on no_show: practitioner, patient and room exclusions all release slot', async () => {
      const appt1Id = randomUUID();
      const appt2Id = randomUUID();

      // Step 1: Book past slot with Room A
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${appt1Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
          now() - interval '3 hours', now() - interval '2 hours' - interval '30 minutes',
          now() - interval '3 hours', now() - interval '2 hours' - interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      // Step 2: Attempting to double-book exact same past slot & room throws 23P01
      try {
        await sql`
          INSERT INTO appointments (
            id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
            starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
          ) VALUES (
            ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
            now() - interval '3 hours', now() - interval '2 hours' - interval '30 minutes',
            now() - interval '3 hours', now() - interval '2 hours' - interval '30 minutes',
            'Europe/Paris', 'scheduled'
          )
        `;
        expect.unreachable('Should have thrown 23P01');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23P01');
      }

      // Step 3: Mark Appt 1 as no_show
      await sql`
        UPDATE appointments
        SET status = 'no_show'
        WHERE id = ${appt1Id}
      `;

      // Step 4: Now booking the exact same slot with same Patient + Practitioner + Room succeeds!
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, room_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${appt2Id}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${roomA}, ${userA},
          now() - interval '3 hours', now() - interval '2 hours' - interval '30 minutes',
          now() - interval '3 hours', now() - interval '2 hours' - interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      const check = await sql`SELECT count(*) as cnt FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
      expect(Number(check[0]?.cnt)).toBe(2);

      await sql`DELETE FROM appointments WHERE id IN (${appt1Id}, ${appt2Id})`;
    });
  });

  describe('Waitlist Checks, Composite Cross-Tenant FKs & State Machine Trigger', () => {
    it('rejects invalid waitlist status with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', 'Europe/Paris', 'invalid_status', ${userA}
          )
        `;
        expect.unreachable('Should have thrown status check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects invalid resolution_code with 23514', async () => {
      const entryId = randomUUID();
      await sql`
        INSERT INTO appointment_waitlist_entries (
          id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
        ) VALUES (
          ${entryId}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', 'Europe/Paris', 'waiting', ${userA}
        )
      `;

      try {
        await sql`
          UPDATE appointment_waitlist_entries
          SET status = 'resolved', resolution_code = 'invalid_code'
          WHERE id = ${entryId}
        `;
        expect.unreachable('Should have thrown resolution code check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      } finally {
        await sql`DELETE FROM appointment_waitlist_entries WHERE id = ${entryId}`;
      }
    });

    it('rejects one-null preferred time (start set, end null) with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, preferred_start_time, preferred_end_time, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', '09:00:00', NULL, 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown time check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects one-null preferred time (start null, end set) with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, preferred_start_time, preferred_end_time, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', NULL, '10:00:00', 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown time check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

    it('rejects reversed preferred times (start >= end) with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, preferred_start_time, preferred_end_time, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', '11:00:00', '10:00:00', 'Europe/Paris', 'waiting', ${userA}
          )
        `;
        expect.unreachable('Should have thrown time check constraint violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23514');
      }
    });

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

    it('rejects waiting status with resolution metadata with 23514', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, resolution_code, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-15', 'Europe/Paris', 'waiting', 'withdrawn', ${userA}
          )
        `;
        expect.unreachable('Should have thrown state check constraint violation');
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

    it('successfully transitions waiting -> resolved (withdrawn) and sets resolved_at = now()', async () => {
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

    it('blocks mutating terminal resolved waitlist entry (reopen or preference change) with 23514', async () => {
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

      // Try reopening resolved -> waiting
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

      // Try modifying fields on resolved entry
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

    // Composite Cross-Tenant Foreign Keys Matrix
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

    it('rejects waitlist entry with cross-tenant appointment_type with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeB}, ${locA}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
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

    it('rejects waitlist entry with cross-tenant practitioner/location assignment with 23503', async () => {
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

    it('rejects waitlist entry with cross-tenant created_by_user with 23503', async () => {
      try {
        await sql`
          INSERT INTO appointment_waitlist_entries (
            id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-01', 'Europe/Paris', 'waiting', ${userB}
          )
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      }
    });

    it('rejects waitlist resolution with cross-tenant resolved_appointment_id with 23503', async () => {
      const entryId = randomUUID();
      const apptOrgBId = randomUUID();

      // Seed appointment in Org B
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
          starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
        ) VALUES (
          ${apptOrgBId}, ${orgB}, ${patientB}, ${pracB}, ${typeB}, ${locB}, ${userB},
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          now() + interval '1 day', now() + interval '1 day' + interval '30 minutes',
          'Europe/Paris', 'scheduled'
        )
      `;

      // Seed waiting entry in Org A
      await sql`
        INSERT INTO appointment_waitlist_entries (
          id, organization_id, patient_id, appointment_type_id, location_id, preferred_date_from, timezone, status, created_by_user_id
        ) VALUES (
          ${entryId}, ${orgA}, ${patientA}, ${typeA}, ${locA}, '2026-10-01', 'Europe/Paris', 'waiting', ${userA}
        )
      `;

      try {
        await sql`
          UPDATE appointment_waitlist_entries
          SET status = 'resolved', resolution_code = 'booked', resolved_appointment_id = ${apptOrgBId}
          WHERE id = ${entryId}
        `;
        expect.unreachable('Should have thrown FK violation for cross-tenant appointment resolution');
      } catch (error: unknown) {
        expect(hasPostgresErrorCode(error)).toBe(true);
        if (hasPostgresErrorCode(error)) expect(error.code).toBe('23503');
      } finally {
        await sql`DELETE FROM appointment_waitlist_entries WHERE id = ${entryId}`;
        await sql`DELETE FROM appointments WHERE id = ${apptOrgBId}`;
      }
    });
  });
});
