import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { withFixtureMaintenance } from '../helpers/neon-fixtures';
import { createRlsTestClient, NeonRlsClient } from '../helpers/neon-rls-client';

// Session 20 — portail client Field Service : lecture limitée à sa fiche client,
// jamais les brouillons ni l'interne, réception des travaux signée et immuable.
const DATABASE_URL = process.env.NEON_ADMIN_DATABASE_URL!;
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;

const orgA = 'org-a-1234';
const linkedClient = 'cli-rec-a-1234'; // fiche reliée à client_a@monservice.invalid
const otherClient = 'cli-portal-test-other';
const site = 'site-portal-test';
const asset = 'asset-portal-test';
const woVisible = 'wo-portal-test-visible';
const woDraft = 'wo-portal-test-draft';
const woOther = 'wo-portal-test-other';
const reportFinal = 'report-portal-test-final';
const reportDraft = 'report-portal-test-draft';
const reportOther = 'report-portal-test-other';
const assignment = 'assign-portal-test';

async function signIn(client: NeonRlsClient, email: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data?.user) throw new Error(`Mandatory authentication failed for ${email}`);
  return data.appUserId as string;
}

const ids = (rows: unknown): string[] =>
  Array.isArray(rows) ? rows.map((row) => String((row as { id: unknown }).id)).sort() : [];

describe('Field Service client portal (Session 20)', () => {
  let sql: postgres.Sql;
  let clientA: NeonRlsClient;
  let clientB: NeonRlsClient;
  let proA: NeonRlsClient;
  let anon: NeonRlsClient;
  let clientAUserId: string;
  let proAUserId: string;

  const cleanup = () =>
    withFixtureMaintenance(sql, async (tx) => {
      await tx`DELETE FROM field_service_work_report_acknowledgements WHERE work_report_id LIKE 'report-portal-test-%'`;
      await tx`DELETE FROM field_service_work_order_assets WHERE work_order_id LIKE 'wo-portal-test-%'`;
      await tx`DELETE FROM field_service_work_reports WHERE id LIKE 'report-portal-test-%'`;
      await tx`DELETE FROM field_service_work_order_assignments WHERE id = ${assignment}`;
      await tx`DELETE FROM field_service_work_order_status_history WHERE work_order_id LIKE 'wo-portal-test-%'`;
      await tx`DELETE FROM field_service_work_orders WHERE id LIKE 'wo-portal-test-%'`;
      await tx`DELETE FROM field_service_assets WHERE id = ${asset}`;
      await tx`DELETE FROM field_service_sites WHERE id = ${site}`;
      await tx`DELETE FROM clients WHERE id = ${otherClient}`;
    });

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    await sql`UPDATE organizations SET sector = 'field_services', profession = 'plumber' WHERE id = ${orgA}`;
    anon = createRlsTestClient();
    clientA = createRlsTestClient();
    clientAUserId = await signIn(clientA, 'client_a@monservice.invalid');
    clientB = createRlsTestClient();
    await signIn(clientB, 'client_b@monservice.invalid');
    proA = createRlsTestClient();
    proAUserId = await signIn(proA, 'pro_a@monservice.invalid');

    await cleanup();
    const now = new Date().toISOString();
    await sql`INSERT INTO clients (id, organization_id, name, created_at, updated_at) VALUES (${otherClient}, ${orgA}, 'Autre client portail', ${now}, ${now})`;
    await sql`INSERT INTO field_service_sites (id, organization_id, client_id, label, address_line1, postal_code, city)
      VALUES (${site}, ${orgA}, ${linkedClient}, 'Maison portail', '3 rue du Portail', '54000', 'Nancy')`;
    await sql`INSERT INTO field_service_assets (id, organization_id, client_id, site_id, category, label)
      VALUES (${asset}, ${orgA}, ${linkedClient}, ${site}, 'heating', 'Chaudière portail')`;
    await sql`INSERT INTO field_service_work_orders (id, organization_id, client_id, site_id, created_by_user_id, reference, title, status, scheduled_start, scheduled_end)
      VALUES (${woVisible}, ${orgA}, ${linkedClient}, ${site}, ${proAUserId}, 'WO-PORTAL-VISIBLE', 'Entretien visible', 'scheduled', now(), now() + interval '2 hours'),
             (${woOther}, ${orgA}, ${otherClient}, NULL, ${proAUserId}, 'WO-PORTAL-OTHER', 'Autre client', 'scheduled', now(), now() + interval '2 hours')`;
    await sql`INSERT INTO field_service_work_orders (id, organization_id, client_id, created_by_user_id, reference, title)
      VALUES (${woDraft}, ${orgA}, ${linkedClient}, ${proAUserId}, 'WO-PORTAL-DRAFT', 'Brouillon interne')`;
    await sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id)
      VALUES ('link-portal-test', ${orgA}, ${linkedClient}, ${woVisible}, ${asset})`;
    await sql`INSERT INTO field_service_work_order_assignments (id, organization_id, work_order_id, user_id, role)
      VALUES (${assignment}, ${orgA}, ${woVisible}, ${proAUserId}, 'lead')`;
    await sql`INSERT INTO field_service_work_reports (id, organization_id, work_order_id, author_user_id, summary)
      VALUES (${reportFinal}, ${orgA}, ${woVisible}, ${proAUserId}, 'Entretien réalisé'),
             (${reportDraft}, ${orgA}, ${woVisible}, ${proAUserId}, 'Notes internes'),
             (${reportOther}, ${orgA}, ${woOther}, ${proAUserId}, 'Autre client')`;
    await sql`UPDATE field_service_work_reports SET status = 'finalized' WHERE id IN (${reportFinal}, ${reportOther})`;
  });

  afterAll(async () => {
    await cleanup();
    await sql.end();
  });

  it('shows the linked client only its non-draft work orders', async () => {
    const { data, error } = await clientA.from('field_service_work_orders').select('id');
    expect(error).toBeNull();
    const visible = ids(data).filter((id) => id.startsWith('wo-portal-test-'));
    expect(visible).toEqual([woVisible]);
  });

  it('shows its own site, assets and links, never another client', async () => {
    expect(ids((await clientA.from('field_service_sites').select('id').eq('id', site)).data)).toEqual([site]);
    expect(ids((await clientA.from('field_service_assets').select('id').eq('id', asset)).data)).toEqual([asset]);
    expect((await clientA.from('field_service_work_order_assets').select('id').eq('work_order_id', woVisible)).data).toHaveLength(1);
  });

  it('shows only finalized reports and never internal assignments or status history', async () => {
    const reports = ids((await clientA.from('field_service_work_reports').select('id')).data).filter((id) => id.startsWith('report-portal-test-'));
    expect(reports).toEqual([reportFinal]);
    expect((await clientA.from('field_service_work_order_assignments').select('id').eq('id', assignment)).data ?? []).toHaveLength(0);
    expect((await clientA.from('field_service_work_order_status_history').select('id').eq('work_order_id', woVisible)).data ?? []).toHaveLength(0);
  });

  it('keeps the client read-only on operational tables', async () => {
    const update = await clientA.from('field_service_work_orders').update({ title: 'Modifié par le client' }).eq('id', woVisible).select('id');
    expect(update.data ?? []).toHaveLength(0);
    const insertAsset = await clientA.from('field_service_assets').insert({ id: 'asset-portal-test-intrusion', organization_id: orgA, client_id: linkedClient, category: 'other', label: 'Intrus' });
    expect(insertAsset.error).not.toBeNull();
    const [row] = await sql`SELECT title FROM field_service_work_orders WHERE id = ${woVisible}`;
    expect(row.title).toBe('Entretien visible');
  });

  it('hides everything from another client account and anonymous sessions', async () => {
    for (const reader of [clientB, anon]) {
      expect((await reader.from('field_service_work_orders').select('id').eq('id', woVisible)).data ?? []).toHaveLength(0);
      expect((await reader.from('field_service_assets').select('id').eq('id', asset)).data ?? []).toHaveLength(0);
      expect((await reader.from('field_service_work_reports').select('id').eq('id', reportFinal)).data ?? []).toHaveLength(0);
    }
  });

  it('refuses acknowledgements of draft, foreign or impersonated reports', async () => {
    const draft = await clientA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-draft', organization_id: orgA, work_report_id: reportDraft, acknowledged_by_user_id: clientAUserId, signer_name: 'Client A' });
    expect(draft.error).not.toBeNull();
    const foreign = await clientA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-foreign', organization_id: orgA, work_report_id: reportOther, acknowledged_by_user_id: clientAUserId, signer_name: 'Client A' });
    expect(foreign.error).not.toBeNull();
    const spoofed = await clientA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-spoof', organization_id: orgA, work_report_id: reportFinal, acknowledged_by_user_id: proAUserId, signer_name: 'Client A' });
    expect(spoofed.error).not.toBeNull();
    const byPro = await proA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-pro', organization_id: orgA, work_report_id: reportFinal, acknowledged_by_user_id: proAUserId, signer_name: 'Pro A' });
    expect(byPro.error).not.toBeNull();
    const reservationsWithoutComment = await clientA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-res', organization_id: orgA, work_report_id: reportFinal, acknowledged_by_user_id: clientAUserId, signer_name: 'Client A', decision: 'accepted_with_reservations' });
    expect(reservationsWithoutComment.error).not.toBeNull();
  });

  it('lets the linked client acknowledge once, immutably, and the professional read it', async () => {
    const ack = await clientA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-ok', organization_id: orgA, work_report_id: reportFinal, acknowledged_by_user_id: clientAUserId, signer_name: 'Alice Client', decision: 'accepted_with_reservations', comment: 'Joint à reprendre sous l’évier' }).select('id');
    expect(ack.error).toBeNull();
    expect(ack.data).toHaveLength(1);

    const twice = await clientA.from('field_service_work_report_acknowledgements').insert({ id: 'ack-portal-test-twice', organization_id: orgA, work_report_id: reportFinal, acknowledged_by_user_id: clientAUserId, signer_name: 'Alice Client' });
    expect(twice.error).not.toBeNull();

    const edit = await clientA.from('field_service_work_report_acknowledgements').update({ signer_name: 'Autre' }).eq('id', 'ack-portal-test-ok');
    expect(edit.error).not.toBeNull();

    const proRead = await proA.from('field_service_work_report_acknowledgements').select('id, decision').eq('work_report_id', reportFinal);
    expect(proRead.error).toBeNull();
    expect(proRead.data).toHaveLength(1);
    expect((await clientB.from('field_service_work_report_acknowledgements').select('id').eq('work_report_id', reportFinal)).data ?? []).toHaveLength(0);
  });
});
