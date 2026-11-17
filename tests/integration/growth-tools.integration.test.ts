import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import postgres from 'postgres';
import { createSecurityScopedClient } from '@/lib/db/security-context';
import { createRlsTestClient, NeonRlsClient } from '../helpers/neon-rls-client';

// 0020 — paiement saisi, relances automatiques, avis vérifiés, vitrine.
// Toutes les écritures passent par des fonctions bornées ; le worker de
// relances ne voit que due_automation_items().
const DATABASE_URL = process.env.NEON_ADMIN_DATABASE_URL!;
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;

const orgA = 'org-generic-a-1234';
const orgB = 'org-generic-b-5678';
const orgHealth = 'org-a-1234';
const slug = 'growth-db-entreprise-a';
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const invoiceIds = ['growth-db-paid', 'growth-db-late', 'growth-db-quote', 'growth-db-health'];

async function signIn(client: NeonRlsClient, email: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data?.user) throw new Error(`Mandatory authentication failed for ${email}`);
  return data.appUserId as string;
}

describe('Growth tools (0020)', () => {
  let sql: postgres.Sql;
  let workerConnection: postgres.Sql;
  let worker: ReturnType<typeof createSecurityScopedClient>;
  let anon: NeonRlsClient;
  let adminA: NeonRlsClient;
  let adminB: NeonRlsClient;
  let clientA: NeonRlsClient;
  let health: NeonRlsClient;

  const cleanup = async () => {
    await sql`DELETE FROM client_reviews WHERE invoice_id = ANY(${invoiceIds})`;
    await sql`DELETE FROM client_review_requests WHERE invoice_id = ANY(${invoiceIds})`;
    await sql`DELETE FROM automation_deliveries WHERE document_id = ANY(${invoiceIds})`;
    await sql`DELETE FROM organization_automation_settings WHERE organization_id IN (${orgA}, ${orgB}, ${orgHealth})`;
    await sql`DELETE FROM organization_portfolio_items WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organization_public_profiles WHERE organization_id IN (${orgA}, ${orgB}, ${orgHealth})`;
    // Une facture émise ne se supprime pas : retour en brouillon par le propriétaire, puis suppression.
    await sql`UPDATE invoices SET status = 'draft' WHERE id = ANY(${invoiceIds})`;
    await sql`DELETE FROM invoices WHERE id = ANY(${invoiceIds})`;
    await sql`DELETE FROM clients WHERE id IN ('growth-db-client', 'growth-db-patient')`;
  };

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    workerConnection = postgres(process.env.NEON_REMINDERS_DATABASE_URL!, { max: 1, prepare: false });
    worker = createSecurityScopedClient(workerConnection, async () => null, () => ({ client: workerConnection, role: 'monservice_reminders', settings: {} }));
    anon = createRlsTestClient();
    adminA = createRlsTestClient();
    await signIn(adminA, 'pro_generic_a@monservice.invalid');
    adminB = createRlsTestClient();
    await signIn(adminB, 'pro_generic_b@monservice.invalid');
    clientA = createRlsTestClient();
    await signIn(clientA, 'client_generic_a@monservice.invalid');
    health = createRlsTestClient();
    await signIn(health, 'pro_health_a@monservice.invalid');
    await cleanup();
    const now = new Date().toISOString();
    await sql`INSERT INTO clients (id, organization_id, name, email, contact_first_name, contact_last_name, created_at, updated_at)
      VALUES ('growth-db-client', ${orgA}, 'Jean Dupont', 'jean.growth@monservice.invalid', 'Jean', 'Dupont', ${now}, ${now}),
             ('growth-db-patient', ${orgHealth}, 'Patient', 'patient.growth@monservice.invalid', null, null, ${now}, ${now})`;
    await sql`INSERT INTO invoices (id, organization_id, client_id, type, number, date, due_date, paid_at, status, total_ht, tax_amount, total_ttc, amount_due, valid_until, created_at, updated_at) VALUES
      ('growth-db-paid', ${orgA}, 'growth-db-client', 'invoice', 'GROWTH-F-1', ${daysAgo(20)}, ${daysAgo(5)}, ${daysAgo(4)}, 'paid', 100, 20, 120, 0, null, ${now}, ${now}),
      ('growth-db-late', ${orgA}, 'growth-db-client', 'invoice', 'GROWTH-F-2', ${daysAgo(50)}, ${daysAgo(20)}, null, 'sent', 200, 40, 240, 240, null, ${now}, ${now}),
      ('growth-db-quote', ${orgA}, 'growth-db-client', 'quote', 'GROWTH-D-1', ${daysAgo(10)}, null, null, 'sent', 300, 60, 360, 360, ${daysAgo(-20)}, ${now}, ${now}),
      ('growth-db-health', ${orgHealth}, 'growth-db-patient', 'invoice', 'GROWTH-H-1', ${daysAgo(20)}, ${daysAgo(20)}, ${daysAgo(4)}, 'paid', 50, 0, 50, 0, null, ${now}, ${now})`;
  });

  afterAll(async () => {
    await cleanup();
    await sql.end();
    await workerConnection.end();
  });

  it('keeps settings admin-only, per organization, and closed to the health sector', async () => {
    expect((await clientA.rpc('save_automation_settings', [true, true, 7, true, 3])).error).not.toBeNull();
    expect((await health.rpc('save_automation_settings', [true, true, 7, true, 3])).error?.message).toContain('sector');
    expect((await adminA.rpc('save_automation_settings', [true, true, 7, true, 3])).error).toBeNull();
    expect((await adminB.from('organization_automation_settings').select('organization_id')).data ?? []).toHaveLength(0);
    expect((await adminA.from('organization_automation_settings').update({ quote_followup_days: 1 }).eq('organization_id', orgA).select('organization_id')).error).not.toBeNull();
  });

  it('lets only the restricted worker list due items, once per level, never for health', async () => {
    await sql`INSERT INTO organization_automation_settings (organization_id, invoice_reminders_enabled, review_requests_enabled) VALUES (${orgHealth}, true, true)`;
    expect((await adminA.rpc('due_automation_items', [50])).error).not.toBeNull();
    const due = (await worker.unsafe('select kind, level, document_id from public.due_automation_items(500)'))
      .filter((row) => invoiceIds.includes(String(row.document_id)))
      .map((row) => `${row.kind}/${row.level}/${row.document_id}`)
      .sort();
    expect(due).toEqual(['invoice_overdue/2/growth-db-late', 'quote_followup/1/growth-db-quote', 'review_request/1/growth-db-paid']);
    await expect(worker.unsafe('select count(*) from public.invoices')).rejects.toMatchObject({ code: '42501' });

    const [first] = await worker.unsafe(`select public.claim_automation_delivery('growth-db-late', 'invoice_overdue', 2) as id`);
    expect(typeof first.id).toBe('string');
    const [second] = await worker.unsafe(`select public.claim_automation_delivery('growth-db-late', 'invoice_overdue', 2) as id`);
    expect(second.id).toBeNull();
    await worker.unsafe('select public.complete_automation_delivery($1, $2)', [first.id, 'sent']);
    const after = (await worker.unsafe('select document_id from public.due_automation_items(500)')).map((row) => row.document_id);
    expect(after).not.toContain('growth-db-late');
    expect((await adminA.from('automation_deliveries').select('status').eq('document_id', 'growth-db-late')).data).toEqual([{ status: 'sent' }]);
    expect((await adminB.from('automation_deliveries').select('status').eq('document_id', 'growth-db-late')).data ?? []).toHaveLength(0);
  });

  it('issues a review link only for a paid invoice of the caller’s organization', async () => {
    expect((await adminA.rpc('request_client_review', ['growth-db-late', hash(newToken())])).error?.message).toContain('Invoice must be paid');
    expect((await adminB.rpc('request_client_review', ['growth-db-paid', hash(newToken())])).error?.message).toContain('Invoice not found');
    expect((await health.rpc('request_client_review', ['growth-db-health', hash(newToken())])).error?.message).toContain('sector');
    expect((await anon.rpc('request_client_review', ['growth-db-paid', hash(newToken())])).error).not.toBeNull();
    const token = newToken();
    expect((await adminA.rpc('request_client_review', ['growth-db-paid', hash(token)])).error).toBeNull();
    expect((await adminA.rpc('request_client_review', ['growth-db-paid', hash(newToken())])).error?.message).toContain('already requested');

    expect((await anon.rpc('preview_client_review_request', [hash(token)])).data?.[0]).toMatchObject({ invoice_number: 'GROWTH-F-1', suggested_name: 'Jean D.', state: 'pending' });
    expect((await anon.rpc('submit_client_review', [hash(token), 6, 'x', 'Jean D.'])).error).not.toBeNull();
    expect((await anon.rpc('submit_client_review', [hash(token), 5, 'Travail soigné', 'Jean D.'])).error).toBeNull();
    expect((await anon.rpc('submit_client_review', [hash(token), 1, 'Encore', 'Jean D.'])).error?.message).toContain('unavailable');
  });

  it('never lets the professional edit a review; reply and report go through bounded functions', async () => {
    const [review] = (await adminA.from('client_reviews').select('id,rating').eq('invoice_id', 'growth-db-paid')).data ?? [];
    expect(review.rating).toBe(5);
    expect((await adminA.from('client_reviews').update({ rating: 1 }).eq('id', review.id).select('id')).error).not.toBeNull();
    expect((await adminA.from('client_reviews').delete().eq('id', review.id).select('id')).error).not.toBeNull();
    expect((await adminB.rpc('reply_client_review', [review.id, 'Pirate'])).error).not.toBeNull();
    expect((await adminA.rpc('reply_client_review', [review.id, 'Merci Jean !'])).error).toBeNull();
    expect((await adminA.rpc('report_client_review', [review.id, 'off_topic'])).error).toBeNull();
    expect((await anon.from('client_reviews').select('id')).data ?? []).toHaveLength(0);
  });

  it('serves a published showcase anonymously with only the chosen fields', async () => {
    expect((await adminA.rpc('save_public_profile', [slug, false, 'Accroche', 'Présentation', 'Metz', '{Metz,Woippy}', '{Dépannage}', false, false, 'https://a.test'])).error).toBeNull();
    expect((await anon.rpc('public_professional_profile', [slug])).data).toHaveLength(0);
    expect((await adminA.rpc('save_public_profile', [slug, true, 'Accroche', 'Présentation', 'Metz', '{Metz,Woippy}', '{Dépannage}', false, false, 'https://a.test'])).error).toBeNull();
    const [profile] = (await anon.rpc('public_professional_profile', [slug.toUpperCase()])).data ?? [];
    expect(profile).toMatchObject({ name: 'Entreprise Générique A', phone: null, email: null, review_count: 1 });
    expect((await anon.rpc('public_professional_reviews', [slug, 10])).data?.[0]).toMatchObject({ author: 'Jean D.', rating: 5, reply: 'Merci Jean !' });
    expect((await adminB.rpc('save_public_profile', [slug, true, null, null, null, '{}', '{}', false, false, null])).error?.message).toContain('organization_public_profiles_slug_unique');
    expect((await adminB.rpc('save_public_profile', ['growth-db-b', true, null, null, null, '{}', '{}', false, false, 'javascript:alert(1)'])).error).not.toBeNull();
    expect((await health.rpc('save_public_profile', ['growth-db-kine', true, null, null, null, '{}', '{}', false, false, null])).error?.message).toContain('sector');
    expect((await clientA.rpc('save_portfolio_item', [null, 'Pirate', null, null, null, 0])).error).not.toBeNull();
    expect((await adminA.rpc('save_portfolio_item', [null, 'Salle de bain', 'Rénovation', 'Metz', '2026-05-01', 0])).error).toBeNull();
    expect((await anon.rpc('public_professional_portfolio', [slug])).data?.[0]).toMatchObject({ title: 'Salle de bain' });
    expect(((await anon.rpc('list_public_professional_slugs')).data ?? []).map((row: { slug: string }) => row.slug)).toContain(slug);
  });

  it('records the payment method and refuses an unknown one', async () => {
    await expect(sql`UPDATE invoices SET payment_method = 'bitcoin' WHERE id = 'growth-db-late'`).rejects.toThrow();
  });
});
