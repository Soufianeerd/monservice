import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SEED_PRACTICE_IDS } from '../../scripts/e2e/seed-local';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLI_A_EMAIL = 'client_a@monservice.com';
const PASSWORD = 'password123';

describe('Practice Structure RLS Integration Tests (Real Supabase Auth)', () => {
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let cliAClient: SupabaseClient;
  let cliAId: string;
  let proBId: string;

  beforeAll(async () => {
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errA } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });
    if (errA) throw new Error(`Failed to login Pro A: ${errA.message}`);

    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: dataB, error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB) throw new Error(`Failed to login Pro B: ${errB.message}`);
    proBId = dataB.user.id;

    cliAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: dataCliA, error: errCliA } = await cliAClient.auth.signInWithPassword({
      email: CLI_A_EMAIL,
      password: PASSWORD,
    });
    if (errCliA) throw new Error(`Failed to login Client A: ${errCliA.message}`);
    cliAId = dataCliA.user.id;
  });

  describe('ANON Table Privilege Denial (42501 on all 5 tables)', () => {
    it('ANON cannot read practice_locations', async () => {
      const { data, error } = await anonClient.from('practice_locations').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('ANON cannot read practice_practitioners', async () => {
      const { data, error } = await anonClient.from('practice_practitioners').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('ANON cannot read practitioner_locations', async () => {
      const { data, error } = await anonClient.from('practitioner_locations').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('ANON cannot read practice_rooms', async () => {
      const { data, error } = await anonClient.from('practice_rooms').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('ANON cannot read practice_resources', async () => {
      const { data, error } = await anonClient.from('practice_resources').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });
  });

  describe('Authenticated POSITIVE Access (Own Tenant - Pro A & Pro B)', () => {
    it('Pro A SELECTs practice_locations A -> exactly 1 row', async () => {
      const { data, error } = await proAClient
        .from('practice_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.locationA);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro A SELECTs practice_practitioners A -> exactly 1 row', async () => {
      const { data, error } = await proAClient
        .from('practice_practitioners')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.practitionerA);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro A SELECTs practitioner_locations A -> exactly 1 row', async () => {
      const { data, error } = await proAClient
        .from('practitioner_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.assignmentA);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro A SELECTs practice_rooms A -> exactly 1 row', async () => {
      const { data, error } = await proAClient
        .from('practice_rooms')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.roomA);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro A SELECTs practice_resources A -> exactly 1 row', async () => {
      const { data, error } = await proAClient
        .from('practice_resources')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.resourceA);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro B SELECTs practice_locations B -> exactly 1 row', async () => {
      const { data, error } = await proBClient
        .from('practice_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.locationB);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro B SELECTs practice_practitioners B -> exactly 1 row', async () => {
      const { data, error } = await proBClient
        .from('practice_practitioners')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.practitionerB);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro B SELECTs practitioner_locations B -> exactly 1 row', async () => {
      const { data, error } = await proBClient
        .from('practitioner_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.assignmentB);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro B SELECTs practice_rooms B -> exactly 1 row', async () => {
      const { data, error } = await proBClient
        .from('practice_rooms')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.roomB);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Pro B SELECTs practice_resources B -> exactly 1 row', async () => {
      const { data, error } = await proBClient
        .from('practice_resources')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.resourceB);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Authenticated NEGATIVE Access (Cross Tenant Isolation)', () => {
    it('Pro A SELECTs practice_locations B -> 0 rows', async () => {
      const { data, error } = await proAClient
        .from('practice_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.locationB);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro A SELECTs practice_practitioners B -> 0 rows', async () => {
      const { data, error } = await proAClient
        .from('practice_practitioners')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.practitionerB);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro A SELECTs practitioner_locations B -> 0 rows', async () => {
      const { data, error } = await proAClient
        .from('practitioner_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.assignmentB);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro A SELECTs practice_rooms B -> 0 rows', async () => {
      const { data, error } = await proAClient
        .from('practice_rooms')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.roomB);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro A SELECTs practice_resources B -> 0 rows', async () => {
      const { data, error } = await proAClient
        .from('practice_resources')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.resourceB);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro A UPDATEs practice_locations B -> 0 rows affected', async () => {
      const { data, error } = await proAClient
        .from('practice_locations')
        .update({ name: 'Hacked Location B' })
        .eq('id', SEED_PRACTICE_IDS.locationB)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify B is intact
      const { data: dataB } = await proBClient
        .from('practice_locations')
        .select('name')
        .eq('id', SEED_PRACTICE_IDS.locationB)
        .single();
      expect(dataB?.name).toBe('Cabinet Lyon Centre');
    });

    it('Pro A UPDATEs practice_practitioners B -> 0 rows affected', async () => {
      const { data, error } = await proAClient
        .from('practice_practitioners')
        .update({ display_name: 'Hacked Dr. B' })
        .eq('id', SEED_PRACTICE_IDS.practitionerB)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify B is intact
      const { data: dataB } = await proBClient
        .from('practice_practitioners')
        .select('display_name')
        .eq('id', SEED_PRACTICE_IDS.practitionerB)
        .single();
      expect(dataB?.display_name).toBe('Dr. John Smith');
    });

    it('Pro A INSERTs practice_locations with organization_id = Org B -> RLS 42501 error', async () => {
      const { error } = await proAClient
        .from('practice_locations')
        .insert({
          id: '10000000-0000-4000-8000-999999999999',
          organization_id: SEED_PRACTICE_IDS.orgB,
          name: 'Hacked Org B Location',
          timezone: 'Europe/Paris',
        })
        .select();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('Pro A attempts to link practitioner to Pro B user (cross-tenant user link) -> rejected', async () => {
      const { error } = await proAClient
        .from('practice_practitioners')
        .insert({
          id: '10000000-0000-4000-8000-999999999998',
          organization_id: SEED_PRACTICE_IDS.orgA,
          user_id: proBId,
          display_name: 'Dr. Cross Link',
          profession: 'physiotherapist',
        })
        .select();
      expect(error).not.toBeNull();
      // Should fail either by composite FK (23503) or RLS WITH CHECK (42501)
      expect(['23503', '42501', 'PGRST116']).toContain(error?.code);
    });

    it('Pro A attempts to link practitioner to Client A (client profile_type) -> rejected by RLS WITH CHECK', async () => {
      const { error } = await proAClient
        .from('practice_practitioners')
        .insert({
          id: '10000000-0000-4000-8000-999999999997',
          organization_id: SEED_PRACTICE_IDS.orgA,
          user_id: cliAId,
          display_name: 'Dr. Fake Client Practitioner',
          profession: 'physiotherapist',
        })
        .select();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });
  });

  describe('Client Profile Direct Access Denial (Same Tenant Org A)', () => {
    it('Client A cannot SELECT practice_locations A -> 0 rows', async () => {
      const { data, error } = await cliAClient
        .from('practice_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.locationA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Client A cannot SELECT practice_practitioners A -> 0 rows', async () => {
      const { data, error } = await cliAClient
        .from('practice_practitioners')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.practitionerA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Client A cannot SELECT practitioner_locations A -> 0 rows', async () => {
      const { data, error } = await cliAClient
        .from('practitioner_locations')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.assignmentA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Client A cannot SELECT practice_rooms A -> 0 rows', async () => {
      const { data, error } = await cliAClient
        .from('practice_rooms')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.roomA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Client A cannot SELECT practice_resources A -> 0 rows', async () => {
      const { data, error } = await cliAClient
        .from('practice_resources')
        .select('*')
        .eq('id', SEED_PRACTICE_IDS.resourceA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Client A cannot UPDATE practice_locations A -> 0 rows affected', async () => {
      const { data, error } = await cliAClient
        .from('practice_locations')
        .update({ name: 'Hacked By Client' })
        .eq('id', SEED_PRACTICE_IDS.locationA)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: proCheck } = await proAClient
        .from('practice_locations')
        .select('name')
        .eq('id', SEED_PRACTICE_IDS.locationA)
        .single();
      expect(proCheck?.name).toBe('Cabinet Principal Paris');
    });

    it('Client A cannot UPDATE practice_practitioners A -> 0 rows affected', async () => {
      const { data, error } = await cliAClient
        .from('practice_practitioners')
        .update({ display_name: 'Hacked Doctor' })
        .eq('id', SEED_PRACTICE_IDS.practitionerA)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: proCheck } = await proAClient
        .from('practice_practitioners')
        .select('display_name')
        .eq('id', SEED_PRACTICE_IDS.practitionerA)
        .single();
      expect(proCheck?.display_name).toBe('Dr. Jane Doe');
    });

    it('Client A cannot UPDATE practitioner_locations A -> 0 rows affected', async () => {
      const { data, error } = await cliAClient
        .from('practitioner_locations')
        .update({ is_primary: false })
        .eq('id', SEED_PRACTICE_IDS.assignmentA)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: proCheck } = await proAClient
        .from('practitioner_locations')
        .select('is_primary')
        .eq('id', SEED_PRACTICE_IDS.assignmentA)
        .single();
      expect(proCheck?.is_primary).toBe(true);
    });

    it('Client A cannot UPDATE practice_rooms A -> 0 rows affected', async () => {
      const { data, error } = await cliAClient
        .from('practice_rooms')
        .update({ name: 'Hacked Room' })
        .eq('id', SEED_PRACTICE_IDS.roomA)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: proCheck } = await proAClient
        .from('practice_rooms')
        .select('name')
        .eq('id', SEED_PRACTICE_IDS.roomA)
        .single();
      expect(proCheck?.name).toBe('Salle 1 - Rééducation');
    });

    it('Client A cannot UPDATE practice_resources A -> 0 rows affected', async () => {
      const { data, error } = await cliAClient
        .from('practice_resources')
        .update({ name: 'Hacked Table' })
        .eq('id', SEED_PRACTICE_IDS.resourceA)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      const { data: proCheck } = await proAClient
        .from('practice_resources')
        .select('name')
        .eq('id', SEED_PRACTICE_IDS.resourceA)
        .single();
      expect(proCheck?.name).toBe('Table de rééducation électrique');
    });

    it('Client A cannot INSERT practice_locations in Org A -> RLS 42501 error', async () => {
      const { error } = await cliAClient
        .from('practice_locations')
        .insert({
          id: '10000000-0000-4000-8000-888888888888',
          organization_id: SEED_PRACTICE_IDS.orgA,
          name: 'Client Injected Location',
          timezone: 'Europe/Paris',
        })
        .select();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('Client A cannot INSERT practice_practitioners in Org A with user_id = NULL -> RLS 42501 error', async () => {
      const { error } = await cliAClient
        .from('practice_practitioners')
        .insert({
          id: '10000000-0000-4000-8000-888888888889',
          organization_id: SEED_PRACTICE_IDS.orgA,
          user_id: null,
          display_name: 'Client Injected Practitioner',
          profession: 'physiotherapist',
        })
        .select();
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });
  });
});
