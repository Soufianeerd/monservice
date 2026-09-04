import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SEED_PATIENT_IDS, SEED_PRACTICE_IDS } from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLI_A_EMAIL = 'client_a@monservice.com';
const PASSWORD = 'password123';

describe('Patient Registry RLS Integration Tests', () => {
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

  describe('Pro A Own Tenant (Org A)', () => {
    it('Pro A can select patient fixture in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_profiles')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.patientA);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const rows = data as Array<{ id: string; birth_name: string }>;
      expect(rows[0].id).toBe(SEED_PATIENT_IDS.patientA);
      expect(rows[0].birth_name).toBe('DUPONT');
    });

    it('Pro A can select representative fixture in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_representatives')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.representativeA);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const rows = data as Array<{ id: string; last_name: string }>;
      expect(rows[0].id).toBe(SEED_PATIENT_IDS.representativeA);
      expect(rows[0].last_name).toBe('DUPONT');
    });

    it('Pro A can select representative link fixture in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_representative_links')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.linkA);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const rows = data as Array<{ id: string; relationship: string }>;
      expect(rows[0].id).toBe(SEED_PATIENT_IDS.linkA);
      expect(rows[0].relationship).toBe('parent');
    });
  });

  describe('Pro B Own Tenant (Org B)', () => {
    it('Pro B can select patient fixture in Org B', async () => {
      const { data, error } = await proBClient
        .from('patient_profiles')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.patientB);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const rows = data as Array<{ id: string; birth_name: string }>;
      expect(rows[0].id).toBe(SEED_PATIENT_IDS.patientB);
      expect(rows[0].birth_name).toBe('DURAND');
    });

    it('Pro B can select representative fixture in Org B', async () => {
      const { data, error } = await proBClient
        .from('patient_representatives')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.representativeB);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const rows = data as Array<{ id: string; last_name: string }>;
      expect(rows[0].id).toBe(SEED_PATIENT_IDS.representativeB);
      expect(rows[0].last_name).toBe('DURAND');
    });

    it('Pro B can select representative link fixture in Org B', async () => {
      const { data, error } = await proBClient
        .from('patient_representative_links')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.linkB);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const rows = data as Array<{ id: string; relationship: string }>;
      expect(rows[0].id).toBe(SEED_PATIENT_IDS.linkB);
      expect(rows[0].relationship).toBe('spouse_partner');
    });
  });

  describe('Cross-Tenant Isolation (Pro A querying/mutating Org B)', () => {
    it('Pro A cannot SELECT Org B patient, representative or link (0 rows)', async () => {
      const { data: patientRows, error: pErr } = await proAClient
        .from('patient_profiles')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.patientB);
      expect(pErr).toBeNull();
      expect(patientRows).toHaveLength(0);

      const { data: repRows, error: rErr } = await proAClient
        .from('patient_representatives')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.representativeB);
      expect(rErr).toBeNull();
      expect(repRows).toHaveLength(0);

      const { data: linkRows, error: lErr } = await proAClient
        .from('patient_representative_links')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.linkB);
      expect(lErr).toBeNull();
      expect(linkRows).toHaveLength(0);
    });

    it('Pro A cannot UPDATE Org B patient, representative or link (0 rows modified) and data remains intact', async () => {
      // 1. Attempt UPDATE on Org B patient
      const { data: pUpdate, error: pErr } = await proAClient
        .from('patient_profiles')
        .update({ birth_name: 'HACKED' })
        .eq('id', SEED_PATIENT_IDS.patientB)
        .select();
      expect(pErr).toBeNull();
      expect(pUpdate).toHaveLength(0);

      // 2. Attempt UPDATE on Org B representative
      const { data: rUpdate, error: rErr } = await proAClient
        .from('patient_representatives')
        .update({ last_name: 'HACKED' })
        .eq('id', SEED_PATIENT_IDS.representativeB)
        .select();
      expect(rErr).toBeNull();
      expect(rUpdate).toHaveLength(0);

      // 3. Attempt UPDATE on Org B link
      const { data: lUpdate, error: lErr } = await proAClient
        .from('patient_representative_links')
        .update({ relationship: 'other' })
        .eq('id', SEED_PATIENT_IDS.linkB)
        .select();
      expect(lErr).toBeNull();
      expect(lUpdate).toHaveLength(0);

      // Verify integrity via Pro B
      const { data: pVerify } = await proBClient
        .from('patient_profiles')
        .select('birth_name')
        .eq('id', SEED_PATIENT_IDS.patientB);
      const pRows = pVerify as Array<{ birth_name: string }> | null;
      expect(pRows?.[0]?.birth_name).toBe('DURAND');

      const { data: rVerify } = await proBClient
        .from('patient_representatives')
        .select('last_name')
        .eq('id', SEED_PATIENT_IDS.representativeB);
      const rRows = rVerify as Array<{ last_name: string }> | null;
      expect(rRows?.[0]?.last_name).toBe('DURAND');
    });

    it('Pro A cannot INSERT patient into Org B (42501 WITH CHECK violation)', async () => {
      const { error } = await proAClient.from('patient_profiles').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgB,
        birth_name: 'HACK',
        first_birth_name: 'Attacker',
        birth_date: '1995-01-01',
        sex: 'male',
        is_active: true,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('Pro A cannot INSERT a link pointing to Org B representative (composite FK or RLS rejection)', async () => {
      const { error } = await proAClient.from('patient_representative_links').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        representative_id: SEED_PATIENT_IDS.representativeB,
        relationship: 'parent',
      });

      expect(error).not.toBeNull();
      expect(['23503', '42501']).toContain(error?.code);
    });
  });

  describe('Client A Isolation (Client in Org A)', () => {
    it('Client A cannot SELECT patient, representative or link (0 rows)', async () => {
      const { data: pData, error: pErr } = await clientAClient
        .from('patient_profiles')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.patientA);
      expect(pErr).toBeNull();
      expect(pData).toHaveLength(0);

      const { data: rData, error: rErr } = await clientAClient
        .from('patient_representatives')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.representativeA);
      expect(rErr).toBeNull();
      expect(rData).toHaveLength(0);

      const { data: lData, error: lErr } = await clientAClient
        .from('patient_representative_links')
        .select('*')
        .eq('id', SEED_PATIENT_IDS.linkA);
      expect(lErr).toBeNull();
      expect(lData).toHaveLength(0);
    });

    it('Client A cannot UPDATE patient, representative or link (0 rows modified)', async () => {
      const { data: pData, error: pErr } = await clientAClient
        .from('patient_profiles')
        .update({ birth_name: 'CLIENT_ATTACK' })
        .eq('id', SEED_PATIENT_IDS.patientA)
        .select();
      expect(pErr).toBeNull();
      expect(pData).toHaveLength(0);

      const { data: rData, error: rErr } = await clientAClient
        .from('patient_representatives')
        .update({ last_name: 'CLIENT_ATTACK' })
        .eq('id', SEED_PATIENT_IDS.representativeA)
        .select();
      expect(rErr).toBeNull();
      expect(rData).toHaveLength(0);

      const { data: lData, error: lErr } = await clientAClient
        .from('patient_representative_links')
        .update({ relationship: 'caregiver' })
        .eq('id', SEED_PATIENT_IDS.linkA)
        .select();
      expect(lErr).toBeNull();
      expect(lData).toHaveLength(0);

      // Verify Pro A data is untouched
      const { data: verifyData } = await proAClient
        .from('patient_profiles')
        .select('birth_name')
        .eq('id', SEED_PATIENT_IDS.patientA);
      const vRows = verifyData as Array<{ birth_name: string }> | null;
      expect(vRows?.[0]?.birth_name).toBe('DUPONT');
    });

    it('Client A cannot INSERT patient, representative or link (42501)', async () => {
      // 1. Patient insert
      const { error: pErr } = await clientAClient.from('patient_profiles').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        birth_name: 'CLIENT_NEW',
        first_birth_name: 'New',
        birth_date: '1995-01-01',
        sex: 'female',
      });
      expect(pErr).not.toBeNull();
      expect(pErr?.code).toBe('42501');

      // 2. Representative insert
      const { error: rErr } = await clientAClient.from('patient_representatives').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        first_name: 'Client',
        last_name: 'Rep',
      });
      expect(rErr).not.toBeNull();
      expect(rErr?.code).toBe('42501');

      // 3. Link insert
      const { error: lErr } = await clientAClient.from('patient_representative_links').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        representative_id: SEED_PATIENT_IDS.representativeA,
        relationship: 'parent',
      });
      expect(lErr).not.toBeNull();
      expect(lErr?.code).toBe('42501');
    });
  });

  describe('Anon Table Privilege Denial (42501 on all 3 tables)', () => {
    it('ANON cannot SELECT patient_profiles (42501)', async () => {
      const { error } = await anonClient.from('patient_profiles').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('ANON cannot SELECT patient_representatives (42501)', async () => {
      const { error } = await anonClient.from('patient_representatives').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('ANON cannot SELECT patient_representative_links (42501)', async () => {
      const { error } = await anonClient.from('patient_representative_links').select('*');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('ANON cannot INSERT into patient_profiles (42501)', async () => {
      const { error } = await anonClient.from('patient_profiles').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        birth_name: 'ANON',
        first_birth_name: 'Anon',
        birth_date: '1995-01-01',
        sex: 'female',
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('ANON cannot INSERT into patient_representatives (42501)', async () => {
      const { error } = await anonClient.from('patient_representatives').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        first_name: 'Anon',
        last_name: 'Rep',
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('ANON cannot INSERT into patient_representative_links (42501)', async () => {
      const { error } = await anonClient.from('patient_representative_links').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        representative_id: SEED_PATIENT_IDS.representativeA,
        relationship: 'parent',
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });
  });
});
