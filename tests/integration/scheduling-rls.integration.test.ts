import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SEED_SCHEDULING_IDS, SEED_PATIENT_IDS, SEED_PRACTICE_IDS } from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLI_A_EMAIL = 'client_a@monservice.com';
const PASSWORD = 'password123';

describe('Scheduling Foundation RLS Integration Tests', () => {
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;

  beforeAll(async () => {
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // Auth Pro A
    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errA } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });
    if (errA) {
      throw new Error(`Failed to login Pro A: ${errA.message}`);
    }

    // Auth Pro B
    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB) {
      throw new Error(`Failed to login Pro B: ${errB.message}`);
    }

    // Auth Client A
    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errCli } = await clientAClient.auth.signInWithPassword({
      email: CLI_A_EMAIL,
      password: PASSWORD,
    });
    if (errCli) {
      throw new Error(`Failed to login Client A: ${errCli.message}`);
    }
  });

  describe('Own Tenant Read Access (Pro A & Pro B)', () => {
    it('Pro A reads all 4 scheduling entities from Org A', async () => {
      const { data: types, error: errType } = await proAClient
        .from('appointment_types')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeA);
      expect(errType).toBeNull();
      expect(types).toHaveLength(1);

      const { data: rules, error: errRule } = await proAClient
        .from('practitioner_availability_rules')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleA);
      expect(errRule).toBeNull();
      expect(rules).toHaveLength(1);

      const { data: exceptions, error: errExc } = await proAClient
        .from('practitioner_availability_exceptions')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionA);
      expect(errExc).toBeNull();
      expect(exceptions).toHaveLength(1);

      const { data: appts, error: errAppt } = await proAClient
        .from('appointments')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentA);
      expect(errAppt).toBeNull();
      expect(appts).toHaveLength(1);
    });

    it('Pro B reads all 4 scheduling entities from Org B', async () => {
      const { data: types, error: errType } = await proBClient
        .from('appointment_types')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeB);
      expect(errType).toBeNull();
      expect(types).toHaveLength(1);

      const { data: rules, error: errRule } = await proBClient
        .from('practitioner_availability_rules')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleB);
      expect(errRule).toBeNull();
      expect(rules).toHaveLength(1);

      const { data: exceptions, error: errExc } = await proBClient
        .from('practitioner_availability_exceptions')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionB);
      expect(errExc).toBeNull();
      expect(exceptions).toHaveLength(1);

      const { data: appts, error: errAppt } = await proBClient
        .from('appointments')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentB);
      expect(errAppt).toBeNull();
      expect(appts).toHaveLength(1);
    });
  });

  describe('Cross-Tenant Isolation (Pro A -> Org B fixtures)', () => {
    it('Pro A cannot SELECT Org B scheduling fixtures (returns 0 rows)', async () => {
      const { data: types } = await proAClient
        .from('appointment_types')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeB);
      expect(types).toHaveLength(0);

      const { data: rules } = await proAClient
        .from('practitioner_availability_rules')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleB);
      expect(rules).toHaveLength(0);

      const { data: exceptions } = await proAClient
        .from('practitioner_availability_exceptions')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionB);
      expect(exceptions).toHaveLength(0);

      const { data: appts } = await proAClient
        .from('appointments')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentB);
      expect(appts).toHaveLength(0);
    });

    it('Pro A cannot UPDATE Org B scheduling fixtures (0 rows affected) and Pro B confirms integrity', async () => {
      const { data: updType } = await proAClient
        .from('appointment_types')
        .update({ name: 'HACKED' })
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeB)
        .select();
      expect(updType).toHaveLength(0);

      const { data: updRule } = await proAClient
        .from('practitioner_availability_rules')
        .update({ start_time: '00:00' })
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleB)
        .select();
      expect(updRule).toHaveLength(0);

      const { data: updExc } = await proAClient
        .from('practitioner_availability_exceptions')
        .update({ kind: 'closed' })
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionB)
        .select();
      expect(updExc).toHaveLength(0);

      const { data: updAppt } = await proAClient
        .from('appointments')
        .update({ timezone: 'HACKED' })
        .eq('id', SEED_SCHEDULING_IDS.appointmentB)
        .select();
      expect(updAppt).toHaveLength(0);

      // Verify Org B fixtures integrity via Pro B
      const { data: checkType } = await proBClient
        .from('appointment_types')
        .select('name')
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeB)
        .single();
      expect(checkType?.name).not.toBe('HACKED');

      const { data: checkRule } = await proBClient
        .from('practitioner_availability_rules')
        .select('start_time')
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleB)
        .single();
      expect(checkRule?.start_time).not.toBe('00:00');

      const { data: checkExc } = await proBClient
        .from('practitioner_availability_exceptions')
        .select('kind')
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionB)
        .single();
      expect(checkExc?.kind).not.toBe('closed');

      const { data: checkAppt } = await proBClient
        .from('appointments')
        .select('timezone')
        .eq('id', SEED_SCHEDULING_IDS.appointmentB)
        .single();
      expect(checkAppt?.timezone).not.toBe('HACKED');
    });

    it('Pro A cannot INSERT into any of the 4 Org B scheduling tables (RLS violation 42501)', async () => {
      const orgBId = '00000000-0000-0000-0000-000000000002';

      const { error: insType } = await proAClient.from('appointment_types').insert({
        id: randomUUID(),
        organization_id: orgBId,
        name: 'Type Rogue',
        duration_minutes: 30,
      });
      expect(insType?.code).toBe('42501');

      const { error: insRule } = await proAClient.from('practitioner_availability_rules').insert({
        id: randomUUID(),
        organization_id: orgBId,
        practitioner_id: SEED_PRACTICE_IDS.practitionerB,
        location_id: SEED_PRACTICE_IDS.locationB,
        weekday: 1,
        start_time: '09:00',
        end_time: '12:00',
        valid_from: '2026-09-01',
      });
      expect(insRule?.code).toBe('42501');

      const { error: insExc } = await proAClient.from('practitioner_availability_exceptions').insert({
        id: randomUUID(),
        organization_id: orgBId,
        practitioner_id: SEED_PRACTICE_IDS.practitionerB,
        location_id: SEED_PRACTICE_IDS.locationB,
        local_date: '2026-09-20',
        kind: 'closed',
      });
      expect(insExc?.code).toBe('42501');

      const { error: insAppt } = await proAClient.from('appointments').insert({
        id: randomUUID(),
        organization_id: orgBId,
        patient_id: SEED_PATIENT_IDS.patientB,
        practitioner_id: SEED_PRACTICE_IDS.practitionerB,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeB,
        location_id: SEED_PRACTICE_IDS.locationB,
        created_by_user_id: randomUUID(),
        starts_at: '2026-09-10T08:00:00Z',
        ends_at: '2026-09-10T08:30:00Z',
        occupancy_starts_at: '2026-09-10T08:00:00Z',
        occupancy_ends_at: '2026-09-10T08:30:00Z',
        timezone: 'Europe/Paris',
      });
      expect(insAppt?.code).toBe('42501');
    });
  });

  describe('Client Profile Rejection (Client A in Org A)', () => {
    it('Client A cannot SELECT from any of the 4 scheduling tables (returns 0 rows)', async () => {
      const { data: types } = await clientAClient
        .from('appointment_types')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeA);
      expect(types).toHaveLength(0);

      const { data: rules } = await clientAClient
        .from('practitioner_availability_rules')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleA);
      expect(rules).toHaveLength(0);

      const { data: exceptions } = await clientAClient
        .from('practitioner_availability_exceptions')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionA);
      expect(exceptions).toHaveLength(0);

      const { data: appts } = await clientAClient
        .from('appointments')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.appointmentA);
      expect(appts).toHaveLength(0);
    });

    it('Client A cannot UPDATE any of the 4 scheduling tables (0 rows affected) and Pro A confirms integrity', async () => {
      const { data: updType } = await clientAClient
        .from('appointment_types')
        .update({ name: 'HACKED' })
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeA)
        .select();
      expect(updType).toHaveLength(0);

      const { data: updRule } = await clientAClient
        .from('practitioner_availability_rules')
        .update({ start_time: '00:00' })
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleA)
        .select();
      expect(updRule).toHaveLength(0);

      const { data: updExc } = await clientAClient
        .from('practitioner_availability_exceptions')
        .update({ kind: 'open' })
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionA)
        .select();
      expect(updExc).toHaveLength(0);

      const { data: updAppt } = await clientAClient
        .from('appointments')
        .update({ timezone: 'HACKED' })
        .eq('id', SEED_SCHEDULING_IDS.appointmentA)
        .select();
      expect(updAppt).toHaveLength(0);

      // Verify Org A fixtures integrity via Pro A
      const { data: checkType } = await proAClient
        .from('appointment_types')
        .select('name')
        .eq('id', SEED_SCHEDULING_IDS.appointmentTypeA)
        .single();
      expect(checkType?.name).not.toBe('HACKED');

      const { data: checkRule } = await proAClient
        .from('practitioner_availability_rules')
        .select('start_time')
        .eq('id', SEED_SCHEDULING_IDS.availabilityRuleA)
        .single();
      expect(checkRule?.start_time).not.toBe('00:00');

      const { data: checkExc } = await proAClient
        .from('practitioner_availability_exceptions')
        .select('kind')
        .eq('id', SEED_SCHEDULING_IDS.availabilityExceptionA)
        .single();
      expect(checkExc?.kind).not.toBe('open');

      const { data: checkAppt } = await proAClient
        .from('appointments')
        .select('timezone')
        .eq('id', SEED_SCHEDULING_IDS.appointmentA)
        .single();
      expect(checkAppt?.timezone).not.toBe('HACKED');
    });

    it('Client A cannot INSERT into any of the 4 scheduling tables (RLS violation 42501)', async () => {
      const orgAId = '00000000-0000-0000-0000-000000000001';

      const { error: insType } = await clientAClient.from('appointment_types').insert({
        id: randomUUID(),
        organization_id: orgAId,
        name: 'Type Client',
        duration_minutes: 30,
      });
      expect(insType?.code).toBe('42501');

      const { error: insRule } = await clientAClient.from('practitioner_availability_rules').insert({
        id: randomUUID(),
        organization_id: orgAId,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        location_id: SEED_PRACTICE_IDS.locationA,
        weekday: 1,
        start_time: '09:00',
        end_time: '12:00',
        valid_from: '2026-09-01',
      });
      expect(insRule?.code).toBe('42501');

      const { error: insExc } = await clientAClient.from('practitioner_availability_exceptions').insert({
        id: randomUUID(),
        organization_id: orgAId,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        location_id: SEED_PRACTICE_IDS.locationA,
        local_date: '2026-09-20',
        kind: 'closed',
      });
      expect(insExc?.code).toBe('42501');

      const { error: insAppt } = await clientAClient.from('appointments').insert({
        id: randomUUID(),
        organization_id: orgAId,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        created_by_user_id: randomUUID(),
        starts_at: '2026-09-10T08:00:00Z',
        ends_at: '2026-09-10T08:30:00Z',
        occupancy_starts_at: '2026-09-10T08:00:00Z',
        occupancy_ends_at: '2026-09-10T08:30:00Z',
        timezone: 'Europe/Paris',
      });
      expect(insAppt?.code).toBe('42501');
    });
  });

  describe('Anonymous Rejection', () => {
    it('Anon cannot SELECT from any of the 4 scheduling tables (RLS error 42501)', async () => {
      const { error: errType } = await anonClient.from('appointment_types').select('*');
      expect(errType?.code).toBe('42501');

      const { error: errRule } = await anonClient.from('practitioner_availability_rules').select('*');
      expect(errRule?.code).toBe('42501');

      const { error: errExc } = await anonClient.from('practitioner_availability_exceptions').select('*');
      expect(errExc?.code).toBe('42501');

      const { error: errAppt } = await anonClient.from('appointments').select('*');
      expect(errAppt?.code).toBe('42501');
    });

    it('Anon cannot INSERT into any of the 4 scheduling tables (RLS error 42501)', async () => {
      const orgAId = '00000000-0000-0000-0000-000000000001';

      const { error: insType } = await anonClient.from('appointment_types').insert({
        id: randomUUID(),
        organization_id: orgAId,
        name: 'Type Anon',
        duration_minutes: 30,
      });
      expect(insType?.code).toBe('42501');

      const { error: insRule } = await anonClient.from('practitioner_availability_rules').insert({
        id: randomUUID(),
        organization_id: orgAId,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        location_id: SEED_PRACTICE_IDS.locationA,
        weekday: 1,
        start_time: '09:00',
        end_time: '12:00',
        valid_from: '2026-09-01',
      });
      expect(insRule?.code).toBe('42501');

      const { error: insExc } = await anonClient.from('practitioner_availability_exceptions').insert({
        id: randomUUID(),
        organization_id: orgAId,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        location_id: SEED_PRACTICE_IDS.locationA,
        local_date: '2026-09-20',
        kind: 'closed',
      });
      expect(insExc?.code).toBe('42501');

      const { error: insAppt } = await anonClient.from('appointments').insert({
        id: randomUUID(),
        organization_id: orgAId,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        created_by_user_id: randomUUID(),
        starts_at: '2026-09-10T08:00:00Z',
        ends_at: '2026-09-10T08:30:00Z',
        occupancy_starts_at: '2026-09-10T08:00:00Z',
        occupancy_ends_at: '2026-09-10T08:30:00Z',
        timezone: 'Europe/Paris',
      });
      expect(insAppt?.code).toBe('42501');
    });
  });
});
