import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLIENT_A_EMAIL = 'client_a@monservice.com';
const PASSWORD = 'password123';

async function signInOrThrow(client: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error || !data?.user) {
    throw new Error(`Mandatory authentication failed for ${email}: ${error?.message || 'No user session returned'}`);
  }
  return data.user.id;
}

describe('Field Service Operations RLS & Multi-Tenant Authority (Session 17)', () => {
  let sql: postgres.Sql;
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;

  let proAUserId: string;
  let proBUserId: string;

  const orgA = 'org-a-1234';
  const orgB = 'org-b-5678';
  const clientIdA = 'cli-rec-a-1234';

  const testSiteIdA = 'site-rls-test-a1';
  const testWorkOrderIdA = 'wo-rls-test-a1';
  const testAssignmentIdA = 'assign-rls-test-a1';
  const testReportIdA = 'report-rls-test-a1';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // 1. Ensure Org A is a Field Service organization and Org B is Field Service
    await sql`
      UPDATE organizations 
      SET sector = 'field_services', profession = 'plumber' 
      WHERE id = ${orgA}
    `;

    await sql`
      UPDATE organizations 
      SET sector = 'field_services', profession = 'electrician' 
      WHERE id = ${orgB}
    `;

    // 2. Initialize Supabase Auth clients
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    proAUserId = await signInOrThrow(proAClient, PRO_A_EMAIL);

    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    proBUserId = await signInOrThrow(proBClient, PRO_B_EMAIL);

    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await signInOrThrow(clientAClient, CLIENT_A_EMAIL);

    // Clean previous test artifacts
    await sql`SET session_replication_role = 'replica'`;
    await sql`DELETE FROM field_service_work_reports WHERE id = ${testReportIdA}`;
    await sql`DELETE FROM field_service_work_order_assignments WHERE id = ${testAssignmentIdA}`;
    await sql`DELETE FROM field_service_work_order_status_history WHERE work_order_id = ${testWorkOrderIdA}`;
    await sql`DELETE FROM field_service_work_orders WHERE id = ${testWorkOrderIdA}`;
    await sql`DELETE FROM field_service_sites WHERE id = ${testSiteIdA}`;
    await sql`SET session_replication_role = 'origin'`;

    // Insert seeded Org A records directly for RLS query testing
    await sql`
      INSERT INTO field_service_sites (
        id, organization_id, client_id, label, address_line1, postal_code, city, country, is_active, created_at, updated_at
      ) VALUES (
        ${testSiteIdA}, ${orgA}, ${clientIdA}, 'Site RLS A1', '10 Rue de Paris', '75001', 'Paris', 'FR', true, now(), now()
      ) ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO field_service_work_orders (
        id, organization_id, client_id, site_id, created_by_user_id, reference, title, work_type, status, priority, created_at, updated_at
      ) VALUES (
        ${testWorkOrderIdA}, ${orgA}, ${clientIdA}, ${testSiteIdA}, ${proAUserId}, 'WO-RLS-TEST-A1', 'Remplacement chaudiere', 'intervention', 'draft', 'medium', now(), now()
      ) ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO field_service_work_order_assignments (
        id, organization_id, work_order_id, user_id, role, is_active, assigned_at, created_at, updated_at
      ) VALUES (
        ${testAssignmentIdA}, ${orgA}, ${testWorkOrderIdA}, ${proAUserId}, 'lead', true, now(), now(), now()
      ) ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO field_service_work_reports (
        id, organization_id, work_order_id, author_user_id, status, summary, created_at, updated_at
      ) VALUES (
        ${testReportIdA}, ${orgA}, ${testWorkOrderIdA}, ${proAUserId}, 'draft', 'Compte rendu intervention', now(), now()
      ) ON CONFLICT (id) DO NOTHING
    `;
  });

  afterAll(async () => {
    await sql`SET session_replication_role = 'replica'`;
    await sql`DELETE FROM field_service_work_reports WHERE id = ${testReportIdA}`;
    await sql`DELETE FROM field_service_work_order_assignments WHERE id = ${testAssignmentIdA}`;
    await sql`DELETE FROM field_service_work_order_status_history WHERE work_order_id = ${testWorkOrderIdA}`;
    await sql`DELETE FROM field_service_work_orders WHERE id = ${testWorkOrderIdA}`;
    await sql`DELETE FROM field_service_sites WHERE id = ${testSiteIdA}`;
    await sql`SET session_replication_role = 'origin'`;
    await sql.end();
  });

  // ==========================================================================
  // 1. Pro A (Own Org) Access
  // ==========================================================================
  describe('Pro A (Field Service Tenant A) Permissions', () => {
    it('Pro A can select sites, work orders, assignments, and reports in Org A', async () => {
      const { data: sites, error: siteErr } = await proAClient
        .from('field_service_sites')
        .select('id, label')
        .eq('id', testSiteIdA);
      expect(siteErr).toBeNull();
      expect(sites).toHaveLength(1);
      expect(sites?.[0]?.id).toBe(testSiteIdA);

      const { data: orders, error: orderErr } = await proAClient
        .from('field_service_work_orders')
        .select('id, reference')
        .eq('id', testWorkOrderIdA);
      expect(orderErr).toBeNull();
      expect(orders).toHaveLength(1);

      const { data: assignments, error: assignErr } = await proAClient
        .from('field_service_work_order_assignments')
        .select('id, role')
        .eq('id', testAssignmentIdA);
      expect(assignErr).toBeNull();
      expect(assignments).toHaveLength(1);

      const { data: reports, error: repErr } = await proAClient
        .from('field_service_work_reports')
        .select('id, summary')
        .eq('id', testReportIdA);
      expect(repErr).toBeNull();
      expect(reports).toHaveLength(1);
    });

    it('Pro A can insert a site in Org A', async () => {
      const newSiteId = randomUUID();
      const { data, error } = await proAClient
        .from('field_service_sites')
        .insert({
          id: newSiteId,
          organization_id: orgA,
          client_id: clientIdA,
          label: 'Nouveau Site Pro A',
          address_line1: '12 Rue Voltaire',
          postal_code: '75011',
          city: 'Paris',
          country: 'FR',
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      // Cleanup
      await sql`DELETE FROM field_service_sites WHERE id = ${newSiteId}`;
    });
  });

  // ==========================================================================
  // 2. Cross-Tenant Isolation (Pro B in Org B)
  // ==========================================================================
  describe('Cross-Tenant Isolation (Pro B)', () => {
    it('Pro B cannot view Org A sites (returns 0 rows)', async () => {
      const { data, error } = await proBClient
        .from('field_service_sites')
        .select('*')
        .eq('id', testSiteIdA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro B cannot view Org A work orders (returns 0 rows)', async () => {
      const { data, error } = await proBClient
        .from('field_service_work_orders')
        .select('*')
        .eq('id', testWorkOrderIdA);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Pro B cannot view Org A assignments or reports (returns 0 rows)', async () => {
      const { data: assignments } = await proBClient
        .from('field_service_work_order_assignments')
        .select('*')
        .eq('id', testAssignmentIdA);
      expect(assignments).toHaveLength(0);

      const { data: reports } = await proBClient
        .from('field_service_work_reports')
        .select('*')
        .eq('id', testReportIdA);
      expect(reports).toHaveLength(0);
    });

    it('Pro B cannot insert a work order targeting Org A', async () => {
      const illicitOrderId = randomUUID();
      const { error } = await proBClient
        .from('field_service_work_orders')
        .insert({
          id: illicitOrderId,
          organization_id: orgA,
          client_id: clientIdA,
          created_by_user_id: proBUserId,
          reference: 'WO-ILLICIT-PRO-B',
          title: 'Illicit Cross Tenant Order',
        });

      expect(error).not.toBeNull();
    });
  });

  // ==========================================================================
  // 3. Client & Anon Restrictions
  // ==========================================================================
  describe('Client & Anonymous Restricted Access', () => {
    it('Client A sees 0 rows for field service sites', async () => {
      const { data, error } = await clientAClient
        .from('field_service_sites')
        .select('*');
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Client A sees 0 rows for field service work orders', async () => {
      const { data, error } = await clientAClient
        .from('field_service_work_orders')
        .select('*');
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Anonymous user sees 0 rows for field service operations tables', async () => {
      const { data: sites } = await anonClient.from('field_service_sites').select('*');
      expect(sites ?? []).toHaveLength(0);

      const { data: orders } = await anonClient.from('field_service_work_orders').select('*');
      expect(orders ?? []).toHaveLength(0);

      const { data: reports } = await anonClient.from('field_service_work_reports').select('*');
      expect(reports ?? []).toHaveLength(0);
    });
  });

  // ==========================================================================
  // 4. Paramedical Practitioner Exclusion
  // ==========================================================================
  describe('Paramedical Practitioner Exclusion', () => {
    it('practitioner from health sector cannot access field service operations', async () => {
      // Temporarily switch Org B to health / physiotherapist
      await sql`
        UPDATE organizations 
        SET sector = 'health', profession = 'physiotherapist' 
        WHERE id = ${orgB}
      `;

      const { data, error } = await proBClient
        .from('field_service_work_orders')
        .select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Restore Org B to field_services / electrician
      await sql`
        UPDATE organizations 
        SET sector = 'field_services', profession = 'electrician' 
        WHERE id = ${orgB}
      `;
    });
  });

  // ==========================================================================
  // 5. Delete Disallowed for Authenticated
  // ==========================================================================
  describe('No DELETE Granted on Field Service Tables', () => {
    it('Pro A cannot directly DELETE a work order via PostgREST (no DELETE permission)', async () => {
      const { error } = await proAClient
        .from('field_service_work_orders')
        .delete()
        .eq('id', testWorkOrderIdA);

      // Error code 42501 (insufficient_privilege) or RLS restriction
      expect(error).not.toBeNull();

      // Verify row still exists in DB
      const [order] = await sql`SELECT id FROM field_service_work_orders WHERE id = ${testWorkOrderIdA}`;
      expect(order).toBeDefined();
    });
  });
});
