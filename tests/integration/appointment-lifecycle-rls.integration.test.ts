import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRlsTestClient, NeonRlsClient } from '../helpers/neon-rls-client';
import postgres from 'postgres';
import { SEED_SCHEDULING_IDS, SEED_PATIENT_IDS, SEED_PRACTICE_IDS } from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.NEON_ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const PRO_A_EMAIL = 'pro_a@monservice.invalid';
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;

describe('Appointment Lifecycle RLS & restricted SQL Invariants (Session 10C)', () => {
  let sql: postgres.Sql;
  let proAClient: NeonRlsClient;
  let proAUserId: string;
  const createdAppointmentIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    proAClient = createRlsTestClient();

    const { data: authData, error: authError } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });

    if (authError || !authData?.user) {
      throw new Error(`Failed to login Pro A: ${authError?.message || 'No user returned'}`);
    }

    proAUserId = authData.appUserId;
  });

  afterAll(async () => {
    if (createdAppointmentIds.length > 0) {
      await sql`DELETE FROM appointments WHERE id = ANY(${createdAppointmentIds})`;
    }
    await sql.end();
  });

  it('P0: direct restricted SQL authenticated professional cannot mark a future appointment no_show', async () => {
    const futureApptId = randomUUID();
    createdAppointmentIds.push(futureApptId);

    const futureStartsAt = '2028-11-20T10:00:00.000Z';
    const futureEndsAt = '2028-11-20T10:30:00.000Z';

    // 1. Insert future scheduled appointment via restricted SQL
    const { error: insertError } = await proAClient
      .from('appointments')
      .insert({
        id: futureApptId,
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        room_id: null,
        created_by_user_id: proAUserId,
        starts_at: futureStartsAt,
        ends_at: futureEndsAt,
        occupancy_starts_at: futureStartsAt,
        occupancy_ends_at: futureEndsAt,
        timezone: 'Europe/Paris',
        status: 'scheduled',
      });

    expect(insertError).toBeNull();

    // 2. Direct restricted SQL UPDATE attempting to mark future appointment as no_show
    const { error: updateError } = await proAClient
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', futureApptId);

    expect(updateError).not.toBeNull();
    expect(updateError?.code).toBe('23514');
    expect(updateError?.message).toBe('Restricted database operation denied');

    // 3. Atomicity & Row Integrity verification: row must remain scheduled with null no_show metadata
    const { data: rows, error: selectError } = await proAClient
      .from('appointments')
      .select('id, status, no_show_at, cancelled_at, cancellation_reason_code, starts_at')
      .eq('id', futureApptId);

    expect(selectError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.status).toBe('scheduled');
    expect(rows?.[0]?.no_show_at).toBeNull();
    expect(rows?.[0]?.cancelled_at).toBeNull();
    expect(rows?.[0]?.cancellation_reason_code).toBeNull();
    expect(new Date(rows?.[0]?.starts_at).toISOString()).toBe(new Date(futureStartsAt).toISOString());
  });

  it('authenticated professional can mark a past appointment no_show through restricted SQL', async () => {
    const pastApptId = randomUUID();
    createdAppointmentIds.push(pastApptId);

    const pastStartsAt = '2026-08-01T09:00:00.000Z';
    const pastEndsAt = '2026-08-01T09:30:00.000Z';

    // 1. Insert past scheduled appointment via restricted SQL
    const { error: insertError } = await proAClient
      .from('appointments')
      .insert({
        id: pastApptId,
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        room_id: null,
        created_by_user_id: proAUserId,
        starts_at: pastStartsAt,
        ends_at: pastEndsAt,
        occupancy_starts_at: pastStartsAt,
        occupancy_ends_at: pastEndsAt,
        timezone: 'Europe/Paris',
        status: 'scheduled',
      });

    expect(insertError).toBeNull();

    // 2. Direct restricted SQL UPDATE to mark past appointment as no_show
    const { error: updateError } = await proAClient
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', pastApptId);

    expect(updateError).toBeNull();

    // 3. Verify state transition success and metadata
    const { data: rows, error: selectError } = await proAClient
      .from('appointments')
      .select('id, status, no_show_at, cancelled_at, cancellation_reason_code')
      .eq('id', pastApptId);

    expect(selectError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.status).toBe('no_show');
    expect(rows?.[0]?.no_show_at).not.toBeNull();
    expect(rows?.[0]?.cancelled_at).toBeNull();
    expect(rows?.[0]?.cancellation_reason_code).toBeNull();
  });
});
