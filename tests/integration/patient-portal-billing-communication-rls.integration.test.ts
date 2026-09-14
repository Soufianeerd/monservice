import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import {
  SEED_PRACTICE_IDS,
  SEED_PATIENT_IDS,
} from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLIENT_A_EMAIL = 'client_a@monservice.com';
const PASSWORD = 'password123';

describe('Patient Portal, Billing & Communication RLS Policies (Session 14)', () => {
  let sql: postgres.Sql;
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;

  let testPortalAccessId: string;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authA, error: errA } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });
    if (errA || !authA?.user) {
      throw new Error(`Failed to authenticate Pro A: ${errA?.message || 'No user'}`);
    }

    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authB, error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB || !authB?.user) {
      throw new Error(`Failed to authenticate Pro B: ${errB?.message || 'No user'}`);
    }

    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authClientA, error: errClientA } = await clientAClient.auth.signInWithPassword({
      email: CLIENT_A_EMAIL,
      password: PASSWORD,
    });
    if (errClientA || !authClientA?.user) {
      throw new Error(`Failed to authenticate Client A: ${errClientA?.message || 'No user'}`);
    }

    testPortalAccessId = randomUUID();
    testAssignmentId = randomUUID();
    testBillingLinkId = randomUUID();

    // Insert direct via SQL
    await sql`
      INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, status, invited_email, created_at, updated_at)
      VALUES (${testPortalAccessId}, ${SEED_PRACTICE_IDS.orgA}, ${SEED_PATIENT_IDS.patientA1}, ${authClientA.user.id}, 'active', ${CLIENT_A_EMAIL}, now(), now())
      ON CONFLICT DO NOTHING
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM patient_portal_access WHERE id = ${testPortalAccessId}`;
    await sql.end();
  });

  describe('patient_portal_access RLS', () => {
    it('anon cannot read patient_portal_access', async () => {
      const { data } = await anonClient
        .from('patient_portal_access')
        .select('*');
      expect(data?.length ?? 0).toBe(0);
    });

    it('pro A can read portal access in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', testPortalAccessId);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it('pro B in Org B CANNOT read portal access of Org A', async () => {
      const { data } = await proBClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', testPortalAccessId);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A can read own portal access record', async () => {
      const { data, error } = await clientAClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', testPortalAccessId);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });
  });

  describe('clinical_documents.patient_visible isolation', () => {
    it('clinical documents are shielded from direct unauthenticated public access', async () => {
      const { data } = await anonClient
        .from('clinical_documents')
        .select('*');
      expect(data?.length ?? 0).toBe(0);
    });
  });
});
