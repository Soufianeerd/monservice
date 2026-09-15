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
const STAFF_A_EMAIL = 'staff_a@monservice.com';
const PASSWORD = 'password123';

describe('Patient Portal, Billing & Communication RLS Policies (Session 14)', () => {
  let sql: postgres.Sql;
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;
  let staffAClient: SupabaseClient;

  let proAUserId: string;
  let clientAUserId: string;
  let staffAUserId: string;

  const patientA1Id = SEED_PATIENT_IDS.patientA;
  const patientA2Id = '30000000-0000-4000-8000-000000000099';
  const portalAccessA1Id = randomUUID();
  const portalAccessA2Id = randomUUID();
  const templateAId = '90000000-0000-4000-8000-000000000002';
  const assignmentA1Id = randomUUID();
  const assignmentA2Id = randomUUID();
  const billingLinkA1Id = randomUUID();

  const createdMessageIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // 1. Authenticate Pro A
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
    proAUserId = authA.user.id;

    // 2. Authenticate Pro B
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

    // 3. Authenticate Client A
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
    clientAUserId = authClientA.user.id;

    // 4. Authenticate Staff A (unlinked professional in Org A)
    staffAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authStaffA, error: errStaffA } = await staffAClient.auth.signInWithPassword({
      email: STAFF_A_EMAIL,
      password: PASSWORD,
    });
    if (errStaffA || !authStaffA?.user) {
      throw new Error(`Failed to authenticate Staff A: ${errStaffA?.message || 'No user'}`);
    }
    staffAUserId = authStaffA.user.id;

    // 5. Seed Patient A2 in Org A
    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, created_at, updated_at)
      VALUES (${patientA2Id}, ${SEED_PRACTICE_IDS.orgA}, 'BERNARD', 'Claire', '1995-03-15', 'female', now(), now())
      ON CONFLICT DO NOTHING
    `;

    // 6. Seed Portal Access: Client A has access to Patient A1 only
    await sql`
      INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, access_type, created_by_user_id, is_active, created_at, updated_at)
      VALUES (${portalAccessA1Id}, ${SEED_PRACTICE_IDS.orgA}, ${patientA1Id}, ${clientAUserId}, 'patient', ${proAUserId}, true, now(), now())
      ON CONFLICT DO NOTHING
    `;

    // Seed Portal Access: Another user (e.g. staffA as dummy placeholder) has access to Patient A2
    await sql`
      INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, access_type, created_by_user_id, is_active, created_at, updated_at)
      VALUES (${portalAccessA2Id}, ${SEED_PRACTICE_IDS.orgA}, ${patientA2Id}, ${staffAUserId}, 'patient', ${proAUserId}, true, now(), now())
      ON CONFLICT DO NOTHING
    `;

    // 7. Seed Questionnaire Assignments
    await sql`
      INSERT INTO patient_questionnaire_assignments (id, organization_id, patient_id, practitioner_id, template_id, status, answers_json, created_at, updated_at)
      VALUES (${assignmentA1Id}, ${SEED_PRACTICE_IDS.orgA}, ${patientA1Id}, ${SEED_PRACTICE_IDS.practitionerA}, ${templateAId}, 'assigned', '{"q1": "val1"}', now(), now())
      ON CONFLICT DO NOTHING
    `;
    await sql`
      INSERT INTO patient_questionnaire_assignments (id, organization_id, patient_id, practitioner_id, template_id, status, answers_json, created_at, updated_at)
      VALUES (${assignmentA2Id}, ${SEED_PRACTICE_IDS.orgA}, ${patientA2Id}, ${SEED_PRACTICE_IDS.practitionerA}, ${templateAId}, 'assigned', '{"q1": "val2"}', now(), now())
      ON CONFLICT DO NOTHING
    `;

    // 8. Seed Billing Link for Patient A1
    await sql`
      INSERT INTO patient_billing_links (id, organization_id, patient_id, client_id, created_at, updated_at)
      VALUES (${billingLinkA1Id}, ${SEED_PRACTICE_IDS.orgA}, ${patientA1Id}, 'cli-rec-a-1234', now(), now())
      ON CONFLICT DO NOTHING
    `;
  });

  afterAll(async () => {
    if (createdMessageIds.length > 0) {
      await sql`DELETE FROM messages WHERE id = ANY(${createdMessageIds})`;
    }
    await sql`DELETE FROM patient_billing_links WHERE id = ${billingLinkA1Id}`;
    await sql`DELETE FROM patient_questionnaire_assignments WHERE id IN (${assignmentA1Id}, ${assignmentA2Id})`;
    await sql`DELETE FROM patient_portal_access WHERE id IN (${portalAccessA1Id}, ${portalAccessA2Id})`;
    await sql`DELETE FROM patient_profiles WHERE id = ${patientA2Id}`;
    await sql.end();
  });

  // =========================================================================
  // 1. PATIENT PORTAL ACCESS RLS MATRIX
  // =========================================================================
  describe('patient_portal_access RLS Matrix', () => {
    it('anon cannot read patient_portal_access', async () => {
      const { data } = await anonClient
        .from('patient_portal_access')
        .select('*');
      expect(data?.length ?? 0).toBe(0);
    });

    it('pro A (active clinical practitioner in Org A) can read portal accesses in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_portal_access')
        .select('*')
        .eq('organization_id', SEED_PRACTICE_IDS.orgA);
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(2);
    });

    it('pro B in Org B CANNOT read portal accesses of Org A', async () => {
      const { data } = await proBClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', portalAccessA1Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A can read own portal access record', async () => {
      const { data, error } = await clientAClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', portalAccessA1Id);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it('client A CANNOT read another same-org patient portal access (same-tenant isolation)', async () => {
      const { data } = await clientAClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', portalAccessA2Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A CANNOT self-grant access to another patient (P0 Self-Grant reject test)', async () => {
      const attackId = randomUUID();
      const { error } = await clientAClient
        .from('patient_portal_access')
        .insert({
          id: attackId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: patientA2Id,
          user_id: clientAUserId,
          access_type: 'patient',
          created_by_user_id: clientAUserId,
          is_active: true,
        });

      // PostgREST / RLS must reject the insert
      expect(error).not.toBeNull();

      // Verify in DB that no row was created
      const rows = await sql`SELECT * FROM patient_portal_access WHERE id = ${attackId}`;
      expect(rows.length).toBe(0);
    });

    it('client A CANNOT direct UPDATE portal access records', async () => {
      await clientAClient
        .from('patient_portal_access')
        .update({ patient_id: patientA2Id })
        .eq('id', portalAccessA1Id);

      // Denied or affected 0 rows
      const [dbRow] = await sql`SELECT patient_id FROM patient_portal_access WHERE id = ${portalAccessA1Id}`;
      expect(dbRow.patient_id).toBe(patientA1Id);
    });

    it('staff A (professional without active practice_practitioner) CANNOT read, insert, or update portal accesses', async () => {
      // 1. SELECT
      const { data: readData } = await staffAClient
        .from('patient_portal_access')
        .select('*')
        .eq('id', portalAccessA1Id);
      expect(readData?.length ?? 0).toBe(0);

      // 2. INSERT
      const attackId = randomUUID();
      const { error: insertError } = await staffAClient
        .from('patient_portal_access')
        .insert({
          id: attackId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: patientA1Id,
          user_id: staffAUserId,
          access_type: 'patient',
          created_by_user_id: staffAUserId,
          is_active: true,
        });
      expect(insertError).not.toBeNull();
      const checkRows = await sql`SELECT * FROM patient_portal_access WHERE id = ${attackId}`;
      expect(checkRows.length).toBe(0);

      // 3. UPDATE
      await staffAClient
        .from('patient_portal_access')
        .update({ is_active: false })
        .eq('id', portalAccessA1Id);
      const [stillActive] = await sql`SELECT is_active FROM patient_portal_access WHERE id = ${portalAccessA1Id}`;
      expect(stillActive.is_active).toBe(true);
    });
  });

  // =========================================================================
  // 2. PATIENT QUESTIONNAIRE ASSIGNMENTS RLS MATRIX
  // =========================================================================
  describe('patient_questionnaire_assignments RLS Matrix', () => {
    it('pro A (owner practitioner) can read assignments in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_questionnaire_assignments')
        .select('*')
        .eq('id', assignmentA1Id);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it('pro B in Org B CANNOT read assignments of Org A', async () => {
      const { data } = await proBClient
        .from('patient_questionnaire_assignments')
        .select('*')
        .eq('id', assignmentA1Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A can SELECT assignment for accessible patient A1', async () => {
      const { data, error } = await clientAClient
        .from('patient_questionnaire_assignments')
        .select('*')
        .eq('id', assignmentA1Id);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it('client A CANNOT SELECT assignment for patient A2 (no portal access)', async () => {
      const { data } = await clientAClient
        .from('patient_questionnaire_assignments')
        .select('*')
        .eq('id', assignmentA2Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A CANNOT direct UPDATE questionnaire answers via PostgREST', async () => {
      await clientAClient
        .from('patient_questionnaire_assignments')
        .update({ answers_json: { q1: 'forged_answer' } })
        .eq('id', assignmentA1Id);

      // Direct update must be rejected or have no effect
      const [dbRow] = await sql`SELECT answers_json FROM patient_questionnaire_assignments WHERE id = ${assignmentA1Id}`;
      expect(dbRow.answers_json).toEqual({ q1: 'val1' });
    });

    it('client A CANNOT direct INSERT questionnaire assignments via PostgREST', async () => {
      const attackId = randomUUID();
      const { error } = await clientAClient
        .from('patient_questionnaire_assignments')
        .insert({
          id: attackId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: patientA1Id,
          practitioner_id: SEED_PRACTICE_IDS.practitionerA,
          template_id: templateAId,
          status: 'assigned',
          answers_json: {},
        });
      expect(error).not.toBeNull();
      const rows = await sql`SELECT * FROM patient_questionnaire_assignments WHERE id = ${attackId}`;
      expect(rows.length).toBe(0);
    });

    it('staff A CANNOT read or mutate questionnaire assignments', async () => {
      const { data } = await staffAClient
        .from('patient_questionnaire_assignments')
        .select('*')
        .eq('id', assignmentA1Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('anon CANNOT read or mutate questionnaire assignments', async () => {
      const { data } = await anonClient
        .from('patient_questionnaire_assignments')
        .select('*')
        .eq('id', assignmentA1Id);
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // =========================================================================
  // 3. PATIENT BILLING LINKS RLS MATRIX
  // =========================================================================
  describe('patient_billing_links RLS Matrix', () => {
    it('pro A (active practitioner) can read billing links in Org A', async () => {
      const { data, error } = await proAClient
        .from('patient_billing_links')
        .select('*')
        .eq('id', billingLinkA1Id);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it('pro B in Org B CANNOT read billing links in Org A', async () => {
      const { data } = await proBClient
        .from('patient_billing_links')
        .select('*')
        .eq('id', billingLinkA1Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A CANNOT read billing links (0 direct access)', async () => {
      const { data } = await clientAClient
        .from('patient_billing_links')
        .select('*')
        .eq('id', billingLinkA1Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('client A CANNOT insert or update billing links', async () => {
      const attackId = randomUUID();
      const { error } = await clientAClient
        .from('patient_billing_links')
        .insert({
          id: attackId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: patientA1Id,
          client_id: 'cli-rec-a-1234',
        });
      expect(error).not.toBeNull();
      const rows = await sql`SELECT * FROM patient_billing_links WHERE id = ${attackId}`;
      expect(rows.length).toBe(0);
    });

    it('staff A CANNOT read or mutate billing links', async () => {
      const { data } = await staffAClient
        .from('patient_billing_links')
        .select('*')
        .eq('id', billingLinkA1Id);
      expect(data?.length ?? 0).toBe(0);
    });

    it('anon CANNOT read or mutate billing links', async () => {
      const { data } = await anonClient
        .from('patient_billing_links')
        .select('*')
        .eq('id', billingLinkA1Id);
      expect(data?.length ?? 0).toBe(0);
    });
  });

  // =========================================================================
  // 4. MESSAGING RLS MATRIX (PATIENT MODE)
  // =========================================================================
  describe('messages RLS Matrix in Patient Mode', () => {
    it('client A can insert a valid message to Pro A for Patient A1', async () => {
      const msgId = randomUUID();
      createdMessageIds.push(msgId);

      const { error } = await clientAClient
        .from('messages')
        .insert({
          id: msgId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          sender_id: clientAUserId,
          receiver_id: proAUserId,
          patient_id: patientA1Id,
          content: 'Bonjour Dr, question sur mes exercices.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      expect(error).toBeNull();

      const [msg] = await sql`SELECT * FROM messages WHERE id = ${msgId}`;
      expect(msg).toBeDefined();
      expect(msg.content).toBe('Bonjour Dr, question sur mes exercices.');
    });

    it('client A CANNOT forge message for Patient A2 (denied by RLS)', async () => {
      const attackMsgId = randomUUID();
      const { error } = await clientAClient
        .from('messages')
        .insert({
          id: attackMsgId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          sender_id: clientAUserId,
          receiver_id: proAUserId,
          patient_id: patientA2Id,
          content: 'Message attaque sur patient A2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      expect(error).not.toBeNull();
      const check = await sql`SELECT * FROM messages WHERE id = ${attackMsgId}`;
      expect(check.length).toBe(0);
    });

    it('client A CANNOT send patient message to arbitrary receiver (non-practitioner)', async () => {
      const attackMsgId = randomUUID();
      const { error } = await clientAClient
        .from('messages')
        .insert({
          id: attackMsgId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          sender_id: clientAUserId,
          receiver_id: staffAUserId, // staff A is not an active practice practitioner
          patient_id: patientA1Id,
          content: 'Message arbitraire non-praticien',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      expect(error).not.toBeNull();
      const check = await sql`SELECT * FROM messages WHERE id = ${attackMsgId}`;
      expect(check.length).toBe(0);
    });

    it('practitioner Pro A can send message to Client A for Patient A1', async () => {
      const msgId = randomUUID();
      createdMessageIds.push(msgId);

      const { error } = await proAClient
        .from('messages')
        .insert({
          id: msgId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          sender_id: proAUserId,
          receiver_id: clientAUserId,
          patient_id: patientA1Id,
          content: 'Voici les consignes pour la séance.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      expect(error).toBeNull();
      const [msg] = await sql`SELECT * FROM messages WHERE id = ${msgId}`;
      expect(msg).toBeDefined();
    });

    it('practitioner Pro A CANNOT send message with patient_id A2 to Client A (Client A has no access to A2)', async () => {
      const attackMsgId = randomUUID();
      const { error } = await proAClient
        .from('messages')
        .insert({
          id: attackMsgId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          sender_id: proAUserId,
          receiver_id: clientAUserId,
          patient_id: patientA2Id,
          content: 'Message illégitime pour client non lié à A2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      expect(error).not.toBeNull();
      const check = await sql`SELECT * FROM messages WHERE id = ${attackMsgId}`;
      expect(check.length).toBe(0);
    });
  });
});
