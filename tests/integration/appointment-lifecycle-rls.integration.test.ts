import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { SEED_SCHEDULING_IDS, SEED_PATIENT_IDS, SEED_PRACTICE_IDS } from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PASSWORD = 'password123';

describe('Appointment Lifecycle RLS & PostgREST Invariants (Session 10C)', () => {
  let sql: postgres.Sql;
  let proAClient: SupabaseClient;
  let proAUserId: string;
  const createdAppointmentIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });

    if (authError || !authData?.user) {
      throw new Error(`Failed to login Pro A: ${authError?.message || 'No user returned'}`);
    }

    proAUserId = authData.user.id;
  });

  afterAll(async () => {
    if (createdAppointmentIds.length > 0) {
      await sql`DELETE FROM appointments WHERE id = ANY(${createdAppointmentIds})`;
    }
    await sql.end();
  });

  it('P0: direct PostgREST authenticated professional cannot mark a future appointment no_show', async () => {
    const futureApptId = randomUUID();
    createdAppointmentIds.push(futureApptId);

    const futureStartsAt = '2028-11-20T10:00:00.000Z';
    const futureEndsAt = '2028-11-20T10:30:00.000Z';

    // 1. Insert future scheduled appointment via PostgREST
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

    // 2. Direct PostgREST UPDATE attempting to mark future appointment as no_show
    const { error: updateError } = await proAClient
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', futureApptId);

    expect(updateError).not.toBeNull();
    expect(updateError?.code).toBe('23514');
    expect(updateError?.message).toContain('Cannot mark a future appointment as no_show');

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

  it('authenticated professional can mark a past appointment no_show through PostgREST', async () => {
    const pastApptId = randomUUID();
    createdAppointmentIds.push(pastApptId);

    const pastStartsAt = '2026-08-01T09:00:00.000Z';
    const pastEndsAt = '2026-08-01T09:30:00.000Z';

    // 1. Insert past scheduled appointment via PostgREST
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

    // 2. Direct PostgREST UPDATE to mark past appointment as no_show
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
