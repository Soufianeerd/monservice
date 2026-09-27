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
const CLIENT_B_EMAIL = 'client_b@monservice.com';
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

describe('Billing Document RLS & Multi-Tenant Authority (Session 18)', () => {
  let sql: postgres.Sql;
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;
  let clientBClient: SupabaseClient;

  let proAUserId: string;
  let proBUserId: string;
  let clientAUserId: string;
  let clientBUserId: string;

  const orgA = 'org-a-1234';
  const orgB = 'org-b-5678';
  const clientIdA = 'cli-rec-a-1234';
  const clientIdB = 'cli-rec-b-5678';

  const testQuoteIdA = `inv-rls-${randomUUID()}`;
  const testSectionIdA = `sec-rls-${randomUUID()}`;
  const testLineIdA = `line-rls-${randomUUID()}`;

  const testQuoteIdB = `inv-rls-${randomUUID()}`;
  const testSectionIdB = `sec-rls-${randomUUID()}`;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Initialize Supabase Auth clients with sign-in-or-throw
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    proAUserId = await signInOrThrow(proAClient, PRO_A_EMAIL);

    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    proBUserId = await signInOrThrow(proBClient, PRO_B_EMAIL);

    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    clientAUserId = await signInOrThrow(clientAClient, CLIENT_A_EMAIL);

    clientBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    clientBUserId = await signInOrThrow(clientBClient, CLIENT_B_EMAIL);

    // Seed test data via DB
    await sql.begin(async (tx) => {
      await tx`SET LOCAL session_replication_role = 'replica'`;

      // Org A Quote
      await tx`
        INSERT INTO invoices (
          id, organization_id, client_id, recipient_user_id, created_by_user_id,
          number, type, status, title, total_ht, tax_amount, total_ttc,
          deposit_mode, deposit_rate, deposit_amount, date, due_date, created_at, updated_at
        ) VALUES (
          ${testQuoteIdA}, ${orgA}, ${clientIdA}, ${clientAUserId}, ${proAUserId},
          'D-2026-RLS1', 'quote', 'sent', 'Devis Test RLS A', 1000, 200, 1200,
          'percentage', 30, 360, now(), now(), now(), now()
        ) ON CONFLICT (id) DO NOTHING;
      `;

      await tx`
        INSERT INTO invoice_sections (
          id, organization_id, invoice_id, kind, title, position, created_at, updated_at
        ) VALUES (
          ${testSectionIdA}, ${orgA}, ${testQuoteIdA}, 'lot', 'Lot A1 RLS', 0, now(), now()
        ) ON CONFLICT (id) DO NOTHING;
      `;

      await tx`
        INSERT INTO invoice_lines (
          id, organization_id, invoice_id, section_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc
        ) VALUES (
          ${testLineIdA}, ${orgA}, ${testQuoteIdA}, ${testSectionIdA}, 'Ligne A1 RLS', 1, 1000, 20, 1000, 1200
        ) ON CONFLICT (id) DO NOTHING;
      `;

      // Org B Quote
      await tx`
        INSERT INTO invoices (
          id, organization_id, client_id, recipient_user_id, created_by_user_id,
          number, type, status, title, total_ht, tax_amount, total_ttc,
          deposit_mode, deposit_rate, deposit_amount, date, due_date, created_at, updated_at
        ) VALUES (
          ${testQuoteIdB}, ${orgB}, ${clientIdB}, ${clientBUserId}, ${proBUserId},
          'D-2026-RLS2', 'quote', 'sent', 'Devis Test RLS B', 500, 100, 600,
          'none', 0, 0, now(), now(), now(), now()
        ) ON CONFLICT (id) DO NOTHING;
      `;

      await tx`
        INSERT INTO invoice_sections (
          id, organization_id, invoice_id, kind, title, position, created_at, updated_at
        ) VALUES (
          ${testSectionIdB}, ${orgB}, ${testQuoteIdB}, 'lot', 'Lot B1 RLS', 0, now(), now()
        ) ON CONFLICT (id) DO NOTHING;
      `;
    });
  });

  afterAll(async () => {
    if (sql) {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL session_replication_role = 'replica'`;
        await tx`DELETE FROM invoice_lines WHERE id = ${testLineIdA}`;
        await tx`DELETE FROM invoice_sections WHERE id IN (${testSectionIdA}, ${testSectionIdB})`;
        await tx`DELETE FROM invoices WHERE id IN (${testQuoteIdA}, ${testQuoteIdB})`;
      });
      await sql.end();
    }
  });

  it('allows Pro A to read quotes and sections in Org A', async () => {
    const { data: quotes, error: qErr } = await proAClient
      .from('invoices')
      .select('id, number, organization_id')
      .eq('id', testQuoteIdA);

    expect(qErr).toBeNull();
    expect(quotes).toHaveLength(1);
    expect(quotes?.[0]?.organization_id).toBe(orgA);

    const { data: sections, error: sErr } = await proAClient
      .from('invoice_sections')
      .select('id, title, organization_id')
      .eq('id', testSectionIdA);

    expect(sErr).toBeNull();
    expect(sections).toHaveLength(1);
    expect(sections?.[0]?.organization_id).toBe(orgA);
  });

  it('strictly blocks Pro A from seeing quotes and sections in Org B (multi-tenant isolation)', async () => {
    const { data: quotes, error: qErr } = await proAClient
      .from('invoices')
      .select('id, number')
      .eq('id', testQuoteIdB);

    expect(qErr).toBeNull();
    expect(quotes).toHaveLength(0); // Invisible

    const { data: sections, error: sErr } = await proAClient
      .from('invoice_sections')
      .select('id, title')
      .eq('id', testSectionIdB);

    expect(sErr).toBeNull();
    expect(sections).toHaveLength(0); // Invisible
  });

  it('strictly blocks Pro B from mutating quotes or sections in Org A', async () => {
    const { data } = await proBClient
      .from('invoice_sections')
      .update({ title: 'Hacked Title By Pro B' })
      .eq('id', testSectionIdA)
      .select();

    // Either error or 0 rows updated
    expect(data?.length ?? 0).toBe(0);

    // Verify row was NOT modified in database
    const [fresh] = await sql`SELECT title FROM invoice_sections WHERE id = ${testSectionIdA}`;
    expect(fresh.title).toBe('Lot A1 RLS');
  });

  it('allows recipient client A to read their assigned quote', async () => {
    const { data: quotes, error } = await clientAClient
      .from('invoices')
      .select('id, number, recipient_user_id')
      .eq('id', testQuoteIdA);

    expect(error).toBeNull();
    expect(quotes).toHaveLength(1);
    expect(quotes?.[0]?.id).toBe(testQuoteIdA);
  });

  it('strictly blocks non-recipient client B from seeing client A quote', async () => {
    const { data: quotes, error } = await clientBClient
      .from('invoices')
      .select('id, number')
      .eq('id', testQuoteIdA);

    expect(error).toBeNull();
    expect(quotes).toHaveLength(0); // Invisible to other clients
  });

  it('strictly blocks anonymous unauthenticated users from reading or writing quotes and sections', async () => {
    const { data: quotes } = await anonClient
      .from('invoices')
      .select('id')
      .eq('id', testQuoteIdA);

    expect(quotes?.length ?? 0).toBe(0);

    const { error: insertError } = await anonClient
      .from('invoice_sections')
      .insert({
        id: randomUUID(),
        organization_id: orgA,
        invoice_id: testQuoteIdA,
        kind: 'lot',
        title: 'Anon Fraud Lot',
        position: 99,
      });

    expect(insertError).toBeDefined();
  });
});
