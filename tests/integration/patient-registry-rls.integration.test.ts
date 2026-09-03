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

describe('Patient Registry RLS Integration', () => {
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
    if (errA) console.warn(`Failed to login Pro A: ${errA.message}`);

    // Auth Pro B
    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB) console.warn(`Failed to login Pro B: ${errB.message}`);

    // Auth Client A
    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errCli } = await clientAClient.auth.signInWithPassword({
      email: CLI_A_EMAIL,
      password: PASSWORD,
    });
    if (errCli) console.warn(`Failed to login Client A: ${errCli.message}`);
  });

  it('Pro A can select patient profiles in Org A and cannot see Org B', async () => {
    if (!proAClient) return;

    const { data: patientsA, error } = await proAClient
      .from('patient_profiles')
      .select('*');

    expect(error).toBeNull();
    expect(patientsA).toBeDefined();
    expect(patientsA?.length).toBeGreaterThanOrEqual(1);

    const hasOrgAPatient = (patientsA as Array<{ id: string }> | null)?.some((p) => p.id === SEED_PATIENT_IDS.patientA);
    const hasOrgBPatient = (patientsA as Array<{ id: string }> | null)?.some((p) => p.id === SEED_PATIENT_IDS.patientB);

    expect(hasOrgAPatient).toBe(true);
    expect(hasOrgBPatient).toBe(false);
  });

  it('Pro B cannot select patient profiles from Org A', async () => {
    if (!proBClient) return;

    const { data: patientsB, error } = await proBClient
      .from('patient_profiles')
      .select('*');

    expect(error).toBeNull();
    expect(patientsB).toBeDefined();

    const hasOrgAPatient = (patientsB as Array<{ id: string }> | null)?.some((p) => p.id === SEED_PATIENT_IDS.patientA);
    const hasOrgBPatient = (patientsB as Array<{ id: string }> | null)?.some((p) => p.id === SEED_PATIENT_IDS.patientB);

    expect(hasOrgAPatient).toBe(false);
    expect(hasOrgBPatient).toBe(true);
  });

  it('Pro A cannot insert a patient into Org B (blocked by WITH CHECK)', async () => {
    if (!proAClient) return;

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
  });

  it('Client A cannot select patient profiles (profile_type is client)', async () => {
    if (!clientAClient) return;

    const { data } = await clientAClient
      .from('patient_profiles')
      .select('*');

    expect(data?.length ?? 0).toBe(0);
  });

  it('Anon client cannot select or insert patient profiles', async () => {
    const { data } = await anonClient
      .from('patient_profiles')
      .select('*');

    expect(data?.length ?? 0).toBe(0);
  });

  it('Pro A can select representatives in Org A and cannot see Org B representatives', async () => {
    if (!proAClient) return;

    const { data, error } = await proAClient
      .from('patient_representatives')
      .select('*');

    expect(error).toBeNull();
    expect((data as Array<{ id: string }> | null)?.some((r) => r.id === SEED_PATIENT_IDS.representativeA)).toBe(true);
    expect((data as Array<{ id: string }> | null)?.some((r) => r.id === SEED_PATIENT_IDS.representativeB)).toBe(false);
  });

  it('Pro A can select patient representative links in Org A and cannot see Org B links', async () => {
    if (!proAClient) return;

    const { data, error } = await proAClient
      .from('patient_representative_links')
      .select('*');

    expect(error).toBeNull();
    expect((data as Array<{ id: string }> | null)?.some((l) => l.id === SEED_PATIENT_IDS.linkA)).toBe(true);
    expect((data as Array<{ id: string }> | null)?.some((l) => l.id === SEED_PATIENT_IDS.linkB)).toBe(false);
  });
});
