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

describe('Clinical Records Database Integrity & State Machines (Session 11)', () => {
  let sql: postgres.Sql;

  const orgA = 'org-clin-test-a';
  const orgB = 'org-clin-test-b';

  const userA = 'user-clin-pro-a';
  const userB = 'user-clin-pro-b';

  const locA = 'loc-clin-test-a';
  const locB = 'loc-clin-test-b';

  const pracA = 'prac-clin-test-a';
  const pracB = 'prac-clin-test-b';

  const patientA = 'pat-clin-test-a';
  const patientB = 'pat-clin-test-b';

  const typeA = 'type-clin-test-a';
  const typeB = 'type-clin-test-b';

  const apptPastScheduledA = 'appt-clin-past-sched-a';
  const apptFutureScheduledA = 'appt-clin-future-sched-a';
  const apptCancelledA = 'appt-clin-canc-a';
  const apptNoShowA = 'appt-clin-noshow-a';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Setup Orgs
    await sql`INSERT INTO organizations (id, name, slug, sector, profession, created_at, updated_at) VALUES (${orgA}, 'Clinical Org A', 'clin-org-a', 'health', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug, sector, profession, created_at, updated_at) VALUES (${orgB}, 'Clinical Org B', 'clin-org-b', 'health', 'osteopath', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Users
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userA}, 'proA@clin.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userB}, 'proB@clin.test', ${orgB}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Locations
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locA}, ${orgA}, 'Cabinet Clin A', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locB}, ${orgB}, 'Cabinet Clin B', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioners
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA}, ${orgA}, ${userA}, 'Dr Clin A', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracB}, ${orgB}, ${userB}, 'Dr Clin B', 'osteopath', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioner-Location assignments
    await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${pracA}, ${locA}, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, created_at, updated_at) VALUES (${randomUUID()}, ${orgB}, ${pracB}, ${locB}, now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Patients
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patientA}, ${orgA}, 'MARTIN', 'Sophie', '1992-03-10', 'female', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at) VALUES (${patientB}, ${orgB}, 'LEFEBVRE', 'Marc', '1988-07-22', 'male', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Appointment Types
    await sql`INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, slot_step_minutes, created_at, updated_at) VALUES (${typeA}, ${orgA}, 'Type Clin A', 30, 0, 0, 15, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO appointment_types (id, organization_id, name, duration_minutes, buffer_before_minutes, buffer_after_minutes, slot_step_minutes, created_at, updated_at) VALUES (${typeB}, ${orgB}, 'Type Clin B', 30, 0, 0, 15, now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Test Appointments for Org A
    await sql`
      INSERT INTO appointments (
        id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
        starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
      ) VALUES (
        ${apptPastScheduledA}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
        now() - interval '2 days', now() - interval '2 days' + interval '30 minutes',
        now() - interval '2 days', now() - interval '2 days' + interval '30 minutes',
        'Europe/Paris', 'scheduled'
      ) ON CONFLICT DO NOTHING
    `;

    await sql`
      INSERT INTO appointments (
        id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
        starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
      ) VALUES (
        ${apptFutureScheduledA}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
        now() + interval '5 days', now() + interval '5 days' + interval '30 minutes',
        now() + interval '5 days', now() + interval '5 days' + interval '30 minutes',
        'Europe/Paris', 'scheduled'
      ) ON CONFLICT DO NOTHING
    `;

    await sql`
      INSERT INTO appointments (
        id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
        starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
      ) VALUES (
        ${apptCancelledA}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
        now() - interval '3 days', now() - interval '3 days' + interval '30 minutes',
        now() - interval '3 days', now() - interval '3 days' + interval '30 minutes',
        'Europe/Paris', 'scheduled'
      ) ON CONFLICT DO NOTHING
    `;
    await sql`
      UPDATE appointments
      SET status = 'cancelled', cancellation_reason_code = 'patient_request'
      WHERE id = ${apptCancelledA} AND status = 'scheduled'
    `;

    await sql`
      INSERT INTO appointments (
        id, organization_id, patient_id, practitioner_id, appointment_type_id, location_id, created_by_user_id,
        starts_at, ends_at, occupancy_starts_at, occupancy_ends_at, timezone, status
      ) VALUES (
        ${apptNoShowA}, ${orgA}, ${patientA}, ${pracA}, ${typeA}, ${locA}, ${userA},
        now() - interval '4 days', now() - interval '4 days' + interval '30 minutes',
        now() - interval '4 days', now() - interval '4 days' + interval '30 minutes',
        'Europe/Paris', 'scheduled'
      ) ON CONFLICT DO NOTHING
    `;
    await sql`
      UPDATE appointments
      SET status = 'no_show'
      WHERE id = ${apptNoShowA} AND status = 'scheduled'
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM clinical_notes WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_encounters WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM care_episodes WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM appointments WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM appointment_types WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_profiles WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practitioner_locations WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_practitioners WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_locations WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql.end();
  });

  // ==========================================
  // CARE EPISODES CONSTRAINTS & STATE MACHINE
  // ==========================================
  describe('Care Episodes Integrity & Trigger Constraints', () => {
    it('rejects invalid status with 23514', async () => {
      const epId = randomUUID();
      try {
        await sql`
          INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
          VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'invalid_status')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('rejects direct closed initial insert with 23514', async () => {
      const epId = randomUUID();
      try {
        await sql`
          INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status, closed_at)
          VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'closed', now())
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('rejects active episode with non-null closed_at with 23514', async () => {
      const epId = randomUUID();
      try {
        await sql`
          INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status, closed_at)
          VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active', now())
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('rejects cross-tenant patient FK with 23503', async () => {
      const epId = randomUUID();
      try {
        await sql`
          INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
          VALUES (${epId}, ${orgA}, ${patientB}, ${pracA}, 'active')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23503');
        }
      }
    });

    it('rejects cross-tenant practitioner FK with 23503', async () => {
      const epId = randomUUID();
      try {
        await sql`
          INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
          VALUES (${epId}, ${orgA}, ${patientA}, ${pracB}, 'active')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23503');
        }
      }
    });

    it('successfully creates active episode and allows title update', async () => {
      const epId = randomUUID();
      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, title, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'Titre Initial', 'active')
      `;

      const rows1 = await sql`SELECT id, status, title, closed_at FROM care_episodes WHERE id = ${epId}`;
      expect(rows1).toHaveLength(1);
      expect(rows1[0]?.status).toBe('active');
      expect(rows1[0]?.title).toBe('Titre Initial');
      expect(rows1[0]?.closed_at).toBeNull();

      await sql`
        UPDATE care_episodes SET title = 'Titre Modifié' WHERE id = ${epId}
      `;

      const rows2 = await sql`SELECT title FROM care_episodes WHERE id = ${epId}`;
      expect(rows2[0]?.title).toBe('Titre Modifié');

      await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
    });

    it('rejects structural patient mutation on care episode with 23514', async () => {
      const epId = randomUUID();
      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;

      try {
        await sql`
          UPDATE care_episodes SET patient_id = ${patientB} WHERE id = ${epId}
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('blocks care episode closing if draft clinical notes exist (23514) and allows close once finalized', async () => {
      const epId = randomUUID();
      const encId = randomUUID();
      const noteId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;

      await sql`
        INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
        VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, now() - interval '1 hour')
      `;

      await sql`
        INSERT INTO clinical_notes (id, organization_id, encounter_id, patient_id, author_practitioner_id, content, status)
        VALUES (${noteId}, ${orgA}, ${encId}, ${patientA}, ${pracA}, 'Observation en brouillon', 'draft')
      `;

      // Attempt to close care episode while note is draft
      try {
        await sql`
          UPDATE care_episodes SET status = 'closed' WHERE id = ${epId}
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      // Finalize note
      await sql`
        UPDATE clinical_notes SET status = 'finalized' WHERE id = ${noteId}
      `;

      // Re-attempt closing care episode
      await sql`
        UPDATE care_episodes SET status = 'closed' WHERE id = ${epId}
      `;

      const closedRow = await sql`SELECT status, closed_at FROM care_episodes WHERE id = ${epId}`;
      expect(closedRow[0]?.status).toBe('closed');
      expect(closedRow[0]?.closed_at).not.toBeNull();

      // Mutation on closed episode is blocked
      try {
        await sql`
          UPDATE care_episodes SET title = 'New Title' WHERE id = ${epId}
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      await sql`DELETE FROM clinical_notes WHERE id = ${noteId}`;
      await sql`DELETE FROM clinical_encounters WHERE id = ${encId}`;
      await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
    });
  });

  // ==========================================
  // CLINICAL ENCOUNTERS CONSTRAINTS & TRIGGERS
  // ==========================================
  describe('Clinical Encounters Integrity & Validation', () => {
    it('rejects future occurred_at with 23514', async () => {
      const epId = randomUUID();
      const encId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;

      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
          VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, now() + interval '2 days')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('rejects encounter creation on closed care episode with 23514', async () => {
      const epId = randomUUID();
      const encId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;
      await sql`UPDATE care_episodes SET status = 'closed' WHERE id = ${epId}`;

      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
          VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, now() - interval '1 hour')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('rejects cross-tenant episode tuple with 23503', async () => {
      const encId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
          VALUES (${encId}, ${orgA}, 'non-existent-ep', ${patientA}, ${pracA}, now() - interval '1 hour')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23503');
        }
      }
    });

    it('rejects linking to future appointment with 23514', async () => {
      const epId = randomUUID();
      const encId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;

      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, appointment_id, occurred_at)
          VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, ${apptFutureScheduledA}, now() - interval '1 hour')
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('rejects linking to cancelled or no_show appointment with 23514', async () => {
      const epId = randomUUID();
      const encId1 = randomUUID();
      const encId2 = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;

      // Cancelled appt link
      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, appointment_id, occurred_at)
          VALUES (${encId1}, ${orgA}, ${epId}, ${patientA}, ${pracA}, ${apptCancelledA}, now() - interval '1 hour')
        `;
        expect.unreachable('Should have thrown for cancelled appt');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      // No-show appt link
      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, appointment_id, occurred_at)
          VALUES (${encId2}, ${orgA}, ${epId}, ${patientA}, ${pracA}, ${apptNoShowA}, now() - interval '1 hour')
        `;
        expect.unreachable('Should have thrown for no_show appt');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('rejects duplicate appointment link with 23505', async () => {
      const epId = randomUUID();
      const encId1 = randomUUID();
      const encId2 = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;

      // 1st encounter linked to past scheduled appointment succeeds
      await sql`
        INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, appointment_id, occurred_at)
        VALUES (${encId1}, ${orgA}, ${epId}, ${patientA}, ${pracA}, ${apptPastScheduledA}, now() - interval '1 hour')
      `;

      // 2nd encounter attempting to link to same appointment fails with unique violation 23505
      try {
        await sql`
          INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, appointment_id, occurred_at)
          VALUES (${encId2}, ${orgA}, ${epId}, ${patientA}, ${pracA}, ${apptPastScheduledA}, now() - interval '30 minutes')
        `;
        expect.unreachable('Should have thrown 23505');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23505');
        }
      } finally {
        await sql`DELETE FROM clinical_encounters WHERE id = ${encId1}`;
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });
  });

  // ==========================================
  // CLINICAL NOTES CONSTRAINTS & STATE MACHINE
  // ==========================================
  describe('Clinical Notes Integrity & Immutability', () => {
    it('rejects empty or blank content with 23514', async () => {
      const epId = randomUUID();
      const encId = randomUUID();
      const noteId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;
      await sql`
        INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
        VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, now() - interval '1 hour')
      `;

      try {
        await sql`
          INSERT INTO clinical_notes (id, organization_id, encounter_id, patient_id, author_practitioner_id, content, status)
          VALUES (${noteId}, ${orgA}, ${encId}, ${patientA}, ${pracA}, '   ', 'draft')
        `;
        expect.unreachable('Should have thrown for blank content');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM clinical_encounters WHERE id = ${encId}`;
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('rejects direct finalized note insert with 23514', async () => {
      const epId = randomUUID();
      const encId = randomUUID();
      const noteId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;
      await sql`
        INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
        VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, now() - interval '1 hour')
      `;

      try {
        await sql`
          INSERT INTO clinical_notes (id, organization_id, encounter_id, patient_id, author_practitioner_id, content, status, finalized_at)
          VALUES (${noteId}, ${orgA}, ${encId}, ${patientA}, ${pracA}, 'Direct finalized attempt', 'finalized', now())
        `;
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      } finally {
        await sql`DELETE FROM clinical_encounters WHERE id = ${encId}`;
        await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
      }
    });

    it('enforces absolute immutability of finalized clinical notes with 23514', async () => {
      const epId = randomUUID();
      const encId = randomUUID();
      const noteId = randomUUID();

      await sql`
        INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, status)
        VALUES (${epId}, ${orgA}, ${patientA}, ${pracA}, 'active')
      `;
      await sql`
        INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at)
        VALUES (${encId}, ${orgA}, ${epId}, ${patientA}, ${pracA}, now() - interval '1 hour')
      `;
      await sql`
        INSERT INTO clinical_notes (id, organization_id, encounter_id, patient_id, author_practitioner_id, content, status)
        VALUES (${noteId}, ${orgA}, ${encId}, ${patientA}, ${pracA}, 'Texte original brouillon', 'draft')
      `;

      // Update draft content succeeds
      await sql`
        UPDATE clinical_notes SET content = 'Texte modifié brouillon' WHERE id = ${noteId}
      `;

      // Finalize note succeeds
      await sql`
        UPDATE clinical_notes SET status = 'finalized' WHERE id = ${noteId}
      `;

      const finalizedRow = await sql`SELECT status, finalized_at FROM clinical_notes WHERE id = ${noteId}`;
      expect(finalizedRow[0]?.status).toBe('finalized');
      expect(finalizedRow[0]?.finalized_at).not.toBeNull();

      // Mutation on finalized note content is strictly rejected with 23514
      try {
        await sql`
          UPDATE clinical_notes SET content = 'Tentative de modification après finalisation' WHERE id = ${noteId}
        `;
        expect.unreachable('Should have thrown 23514');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      // Reopening (finalized -> draft) is strictly rejected with 23514
      try {
        await sql`
          UPDATE clinical_notes SET status = 'draft' WHERE id = ${noteId}
        `;
        expect.unreachable('Should have thrown 23514');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      await sql`DELETE FROM clinical_notes WHERE id = ${noteId}`;
      await sql`DELETE FROM clinical_encounters WHERE id = ${encId}`;
      await sql`DELETE FROM care_episodes WHERE id = ${epId}`;
    });
  });
});
