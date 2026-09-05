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

describe('Waitlist RLS Integration Tests (Session 10)', () => {
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
    it('Pro A reads waitlist entry from Org A', async () => {
      const { data: entries, error } = await proAClient
        .from('appointment_waitlist_entries')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryA);
      expect(error).toBeNull();
      expect(entries).toHaveLength(1);
      expect(entries?.[0]?.status).toBe('waiting');
    });

    it('Pro B reads waitlist entry from Org B', async () => {
      const { data: entries, error } = await proBClient
        .from('appointment_waitlist_entries')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryB);
      expect(error).toBeNull();
      expect(entries).toHaveLength(1);
      expect(entries?.[0]?.status).toBe('waiting');
    });
  });

  describe('Cross-Tenant Isolation (Pro A -> Org B fixtures)', () => {
    it('Pro A cannot SELECT Org B waitlist entry (returns 0 rows)', async () => {
      const { data: entries } = await proAClient
        .from('appointment_waitlist_entries')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryB);
      expect(entries).toHaveLength(0);
    });

    it('Pro A cannot UPDATE Org B waitlist entry (0 rows affected) and Pro B confirms integrity', async () => {
      const { data: upd } = await proAClient
        .from('appointment_waitlist_entries')
        .update({ preferred_date_from: '2026-12-01' })
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryB)
        .select();
      expect(upd).toHaveLength(0);

      // Verify Org B integrity via Pro B
      const { data: check } = await proBClient
        .from('appointment_waitlist_entries')
        .select('preferred_date_from')
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryB)
        .single();
      expect(check?.preferred_date_from).not.toBe('2026-12-01');
    });

    it('Pro A cannot INSERT into Org B waitlist table (RLS violation 42501)', async () => {
      const orgBId = '00000000-0000-0000-0000-000000000002';

      const { error } = await proAClient.from('appointment_waitlist_entries').insert({
        id: randomUUID(),
        organization_id: orgBId,
        patient_id: SEED_PATIENT_IDS.patientB,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeB,
        location_id: SEED_PRACTICE_IDS.locationB,
        preferred_date_from: '2026-10-01',
        timezone: 'Europe/Paris',
        status: 'waiting',
        created_by_user_id: randomUUID(),
      });
      expect(error?.code).toBe('42501');
    });
  });

  describe('Client Profile Rejection (Client A in Org A)', () => {
    it('Client A cannot SELECT from waitlist table (returns 0 rows)', async () => {
      const { data: entries } = await clientAClient
        .from('appointment_waitlist_entries')
        .select('*')
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryA);
      expect(entries).toHaveLength(0);
    });

    it('Client A cannot UPDATE waitlist table (0 rows affected) and Pro A confirms integrity', async () => {
      const { data: upd } = await clientAClient
        .from('appointment_waitlist_entries')
        .update({ preferred_date_from: '2026-12-01' })
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryA)
        .select();
      expect(upd).toHaveLength(0);

      const { data: check } = await proAClient
        .from('appointment_waitlist_entries')
        .select('preferred_date_from')
        .eq('id', SEED_SCHEDULING_IDS.waitlistEntryA)
        .single();
      expect(check?.preferred_date_from).not.toBe('2026-12-01');
    });

    it('Client A cannot INSERT into waitlist table (RLS violation 42501)', async () => {
      const orgAId = '00000000-0000-0000-0000-000000000001';

      const { error } = await clientAClient.from('appointment_waitlist_entries').insert({
        id: randomUUID(),
        organization_id: orgAId,
        patient_id: SEED_PATIENT_IDS.patientA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        preferred_date_from: '2026-10-01',
        timezone: 'Europe/Paris',
        status: 'waiting',
        created_by_user_id: randomUUID(),
      });
      expect(error?.code).toBe('42501');
    });
  });

  describe('Anonymous Rejection', () => {
    it('Anon cannot SELECT from waitlist table (RLS error 42501)', async () => {
      const { error } = await anonClient.from('appointment_waitlist_entries').select('*');
      expect(error?.code).toBe('42501');
    });

    it('Anon cannot INSERT into waitlist table (RLS error 42501)', async () => {
      const orgAId = '00000000-0000-0000-0000-000000000001';

      const { error } = await anonClient.from('appointment_waitlist_entries').insert({
        id: randomUUID(),
        organization_id: orgAId,
        patient_id: SEED_PATIENT_IDS.patientA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        preferred_date_from: '2026-10-01',
        timezone: 'Europe/Paris',
        status: 'waiting',
        created_by_user_id: randomUUID(),
      });
      expect(error?.code).toBe('42501');
    });
  });
});
