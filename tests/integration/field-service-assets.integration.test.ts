import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { withFixtureMaintenance } from '../helpers/neon-fixtures';
import { createRlsTestClient, NeonRlsClient } from '../helpers/neon-rls-client';

// Session 19 — Customer Assets & Equipment Tracking: database guards and RLS.
const DATABASE_URL = process.env.NEON_ADMIN_DATABASE_URL!;
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;

const orgA = 'org-a-1234';
const orgB = 'org-b-5678';
const clientA = 'cli-rec-a-1234';
const clientA2 = 'cli-asset-test-a2';
const clientB = 'cli-rec-b-5678';
const siteA = 'site-asset-test-a';
const siteA2 = 'site-asset-test-a2';
const assetA = 'asset-test-a';
const assetDecommissioned = 'asset-test-decommissioned';
const workOrderA = 'wo-asset-test-a';
const workOrderA2 = 'wo-asset-test-a2';

async function signIn(client: NeonRlsClient, email: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data?.user) throw new Error(`Mandatory authentication failed for ${email}`);
  return data.appUserId as string;
}

async function rejection(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (err) {
    return typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : 'unknown';
  }
}

describe('Field Service customer assets (Session 19)', () => {
  let sql: postgres.Sql;
  let anon: NeonRlsClient;
  let proA: NeonRlsClient;
  let proB: NeonRlsClient;
  let clientUserA: NeonRlsClient;
  let proAUserId: string;

  const cleanup = () =>
    withFixtureMaintenance(sql, async (tx) => {
      await tx`DELETE FROM field_service_work_order_assets WHERE organization_id IN (${orgA}, ${orgB}) AND (asset_id LIKE 'asset-test-%' OR work_order_id LIKE 'wo-asset-test-%')`;
      await tx`DELETE FROM field_service_assets WHERE id LIKE 'asset-test-%' OR label LIKE 'RLS asset %'`;
      await tx`DELETE FROM field_service_work_order_status_history WHERE work_order_id LIKE 'wo-asset-test-%'`;
      await tx`DELETE FROM field_service_work_orders WHERE id LIKE 'wo-asset-test-%'`;
      await tx`DELETE FROM field_service_sites WHERE id LIKE 'site-asset-test-%'`;
      await tx`DELETE FROM clients WHERE id = ${clientA2}`;
    });

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    await sql`UPDATE organizations SET sector = 'field_services', profession = 'plumber' WHERE id = ${orgA}`;
    await sql`UPDATE organizations SET sector = 'field_services', profession = 'electrician' WHERE id = ${orgB}`;

    anon = createRlsTestClient();
    proA = createRlsTestClient();
    proAUserId = await signIn(proA, 'pro_a@monservice.invalid');
    proB = createRlsTestClient();
    await signIn(proB, 'pro_b@monservice.invalid');
    clientUserA = createRlsTestClient();
    await signIn(clientUserA, 'client_a@monservice.invalid');

    await cleanup();
    const now = new Date().toISOString();
    await sql`INSERT INTO clients (id, organization_id, name, created_at, updated_at) VALUES (${clientA2}, ${orgA}, 'Client équipements A2', ${now}, ${now})`;
    await sql`INSERT INTO field_service_sites (id, organization_id, client_id, label, address_line1, postal_code, city)
      VALUES (${siteA}, ${orgA}, ${clientA}, 'Maison A', '1 rue A', '54000', 'Nancy'),
             (${siteA2}, ${orgA}, ${clientA2}, 'Maison A2', '2 rue A', '57000', 'Metz')`;
    await sql`INSERT INTO field_service_assets (id, organization_id, client_id, site_id, category, label, manufacturer, serial_number, installed_on, warranty_ends_on)
      VALUES (${assetA}, ${orgA}, ${clientA}, ${siteA}, 'heating', 'Chaudière test', 'Viessmann', 'SN-TEST-1', '2024-01-01', '2026-01-01')`;
    await sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, status)
      VALUES (${assetDecommissioned}, ${orgA}, ${clientA}, 'cooling', 'Clim retirée', 'decommissioned')`;
    await sql`INSERT INTO field_service_work_orders (id, organization_id, client_id, site_id, created_by_user_id, reference, title)
      VALUES (${workOrderA}, ${orgA}, ${clientA}, ${siteA}, ${proAUserId}, 'WO-ASSET-TEST-A', 'Entretien annuel'),
             (${workOrderA2}, ${orgA}, ${clientA2}, ${siteA2}, ${proAUserId}, 'WO-ASSET-TEST-A2', 'Autre client')`;
  });

  afterAll(async () => {
    await cleanup();
    await sql.end();
  });

  describe('database guards', () => {
    it('rejects a site that belongs to another client of the same organization', async () => {
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, site_id, category, label)
        VALUES ('asset-test-bad-site', ${orgA}, ${clientA}, ${siteA2}, 'other', 'Mauvais site')`)).toBe('23503');
    });

    it('rejects a client from another organization', async () => {
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label)
        VALUES ('asset-test-bad-client', ${orgA}, ${clientB}, 'other', 'Client étranger')`)).toBe('23503');
    });

    it('enforces categories, label length and warranty chronology', async () => {
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label) VALUES ('asset-test-cat', ${orgA}, ${clientA}, 'rocket', 'X')`)).toBe('23514');
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label) VALUES ('asset-test-lbl', ${orgA}, ${clientA}, 'other', '   ')`)).toBe('23514');
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, installed_on, warranty_ends_on)
        VALUES ('asset-test-dates', ${orgA}, ${clientA}, 'other', 'Dates', '2025-01-02', '2025-01-01')`)).toBe('23514');
    });

    it('keeps serial numbers unique per manufacturer within an organization', async () => {
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, manufacturer, serial_number)
        VALUES ('asset-test-dup', ${orgA}, ${clientA}, 'heating', 'Doublon', 'Viessmann', 'SN-TEST-1')`)).toBe('23505');
      await sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, manufacturer, serial_number)
        VALUES ('asset-test-other-brand', ${orgA}, ${clientA}, 'heating', 'Autre marque', 'Atlantic', 'SN-TEST-1')`;
    });

    it('makes asset identity immutable and refreshes updated_at', async () => {
      expect(await rejection(sql`UPDATE field_service_assets SET client_id = ${clientA2} WHERE id = ${assetA}`)).toBe('23514');
      const [before] = await sql`SELECT updated_at FROM field_service_assets WHERE id = ${assetA}`;
      await sql`UPDATE field_service_assets SET notes = 'Ramonage fait' WHERE id = ${assetA}`;
      const [after] = await sql`SELECT updated_at, notes FROM field_service_assets WHERE id = ${assetA}`;
      expect(after.notes).toBe('Ramonage fait');
      expect(new Date(after.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(before.updated_at).getTime());
    });

    it('keeps a decommissioned asset read-only', async () => {
      expect(await rejection(sql`UPDATE field_service_assets SET status = 'active' WHERE id = ${assetDecommissioned}`)).toBe('23514');
      expect(await rejection(sql`UPDATE field_service_assets SET label = 'Renommée' WHERE id = ${assetDecommissioned}`)).toBe('23514');
    });

    it('links only an asset and a work order of the same client', async () => {
      expect(await rejection(sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id)
        VALUES ('link-test-mismatch', ${orgA}, ${clientA2}, ${workOrderA2}, ${assetA})`)).toBe('23503');
      expect(await rejection(sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id)
        VALUES ('link-test-mismatch2', ${orgA}, ${clientA}, ${workOrderA2}, ${assetA})`)).toBe('23503');
    });

    it('refuses to link a decommissioned asset and to update or duplicate a link', async () => {
      expect(await rejection(sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id)
        VALUES ('link-test-dead', ${orgA}, ${clientA}, ${workOrderA}, ${assetDecommissioned})`)).toBe('23514');
      await sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id)
        VALUES ('link-test-ok', ${orgA}, ${clientA}, ${workOrderA}, ${assetA})`;
      expect(await rejection(sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id)
        VALUES ('link-test-dup', ${orgA}, ${clientA}, ${workOrderA}, ${assetA})`)).toBe('23505');
      expect(await rejection(sql`UPDATE field_service_work_order_assets SET created_at = now() WHERE id = 'link-test-ok'`)).toBe('23514');
      await sql`DELETE FROM field_service_work_order_assets WHERE id = 'link-test-ok'`;
    });

    it('enables RLS with the account lifecycle restriction on both tables', async () => {
      const rows = await sql`SELECT c.relname, c.relrowsecurity,
          EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polname = 'account_active_required' AND NOT p.polpermissive) AS restricted
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN ('field_service_assets', 'field_service_work_order_assets') ORDER BY 1`;
      expect(rows).toEqual([
        { relname: 'field_service_assets', relrowsecurity: true, restricted: true },
        { relname: 'field_service_work_order_assets', relrowsecurity: true, restricted: true },
      ]);
    });
  });

  describe('preventive maintenance (Session 19B)', () => {
    const maintained = 'asset-test-maintained';
    const notPeriodic = 'asset-test-not-periodic';
    const maintenanceOrder = 'wo-asset-test-maint';
    const repairOrder = 'wo-asset-test-repair';

    const complete = async (id: string) => {
      await sql`UPDATE field_service_work_orders SET status = 'scheduled', scheduled_start = now(), scheduled_end = now() + interval '1 hour' WHERE id = ${id}`;
      await sql`UPDATE field_service_work_orders SET status = 'in_progress' WHERE id = ${id}`;
      await sql`UPDATE field_service_work_orders SET status = 'completed' WHERE id = ${id}`;
    };

    it('bounds the maintenance interval between 1 and 120 months', async () => {
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, maintenance_interval_months)
        VALUES ('asset-test-interval0', ${orgA}, ${clientA}, 'other', 'Zéro', 0)`)).toBe('23514');
      expect(await rejection(sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, maintenance_interval_months)
        VALUES ('asset-test-interval121', ${orgA}, ${clientA}, 'other', 'Trop', 121)`)).toBe('23514');
    });

    it('advances the next maintenance date only when a linked maintenance order completes', async () => {
      await sql`INSERT INTO field_service_assets (id, organization_id, client_id, category, label, maintenance_interval_months, next_maintenance_on)
        VALUES (${maintained}, ${orgA}, ${clientA}, 'heating', 'Chaudière périodique', 12, '2020-01-01'),
               (${notPeriodic}, ${orgA}, ${clientA}, 'heating', 'Sans périodicité', NULL, '2020-01-01')`;
      await sql`INSERT INTO field_service_work_orders (id, organization_id, client_id, created_by_user_id, reference, title, work_type)
        VALUES (${repairOrder}, ${orgA}, ${clientA}, ${proAUserId}, 'WO-ASSET-TEST-REPAIR', 'Dépannage', 'repair'),
               (${maintenanceOrder}, ${orgA}, ${clientA}, ${proAUserId}, 'WO-ASSET-TEST-MAINT', 'Entretien annuel', 'maintenance')`;
      await sql`INSERT INTO field_service_work_order_assets (id, organization_id, client_id, work_order_id, asset_id) VALUES
        ('link-test-repair', ${orgA}, ${clientA}, ${repairOrder}, ${maintained}),
        ('link-test-maint', ${orgA}, ${clientA}, ${maintenanceOrder}, ${maintained}),
        ('link-test-maint2', ${orgA}, ${clientA}, ${maintenanceOrder}, ${notPeriodic})`;

      await complete(repairOrder);
      const [afterRepair] = await sql`SELECT next_maintenance_on::text AS d FROM field_service_assets WHERE id = ${maintained}`;
      expect(afterRepair.d).toBe('2020-01-01');

      await complete(maintenanceOrder);
      const [[expected], [periodic], [untouched]] = await Promise.all([
        sql`SELECT (((now() AT TIME ZONE 'Europe/Paris')::date) + interval '12 months')::date::text AS d`,
        sql`SELECT next_maintenance_on::text AS d FROM field_service_assets WHERE id = ${maintained}`,
        sql`SELECT next_maintenance_on::text AS d FROM field_service_assets WHERE id = ${notPeriodic}`,
      ]);
      expect(periodic.d).toBe(expected.d);
      expect(untouched.d).toBe('2020-01-01');
    });

    it('lets the professional set the interval and next date but not another tenant', async () => {
      const own = await proA.from('field_service_assets').update({ maintenance_interval_months: 6, next_maintenance_on: '2030-06-01' }).eq('id', maintained).select('id');
      expect(own.error).toBeNull();
      expect(own.data).toHaveLength(1);
      const foreign = await proB.from('field_service_assets').update({ next_maintenance_on: '2099-01-01' }).eq('id', maintained).select('id');
      expect(foreign.data ?? []).toHaveLength(0);
      const [row] = await sql`SELECT next_maintenance_on::text AS d FROM field_service_assets WHERE id = ${maintained}`;
      expect(row.d).toBe('2030-06-01');
    });
  });

  describe('row level security', () => {
    it('lets the Field Service professional read and create assets in their organization', async () => {
      const { data, error } = await proA.from('field_service_assets').select('id, label').eq('id', assetA);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      const id = randomUUID();
      const inserted = await proA.from('field_service_assets').insert({ id, organization_id: orgA, client_id: clientA, category: 'plumbing', label: 'RLS asset A' }).select('id');
      expect(inserted.error).toBeNull();
      expect(inserted.data).toHaveLength(1);
    });

    it('lets the professional link and unlink an asset on their own work order', async () => {
      const link = await proA.from('field_service_work_order_assets').insert({ id: 'link-test-rls', organization_id: orgA, client_id: clientA, work_order_id: workOrderA, asset_id: assetA }).select('id');
      expect(link.error).toBeNull();
      const removed = await proA.from('field_service_work_order_assets').delete().eq('id', 'link-test-rls').select('id');
      expect(removed.error).toBeNull();
      expect(removed.data).toHaveLength(1);
    });

    it('never lets the runtime delete an asset (decommission instead)', async () => {
      const { error } = await proA.from('field_service_assets').delete().eq('id', assetA);
      expect(error).not.toBeNull();
      const [still] = await sql`SELECT id FROM field_service_assets WHERE id = ${assetA}`;
      expect(still).toBeDefined();
    });

    it('isolates another tenant completely', async () => {
      const read = await proB.from('field_service_assets').select('id').eq('id', assetA);
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(0);

      const write = await proB.from('field_service_assets').insert({ id: randomUUID(), organization_id: orgA, client_id: clientA, category: 'other', label: 'RLS asset intrusion' });
      expect(write.error).not.toBeNull();

      const update = await proB.from('field_service_assets').update({ label: 'Piraté' }).eq('id', assetA).select('id');
      expect(update.data ?? []).toHaveLength(0);
      const [row] = await sql`SELECT label FROM field_service_assets WHERE id = ${assetA}`;
      expect(row.label).toBe('Chaudière test');

      const link = await proB.from('field_service_work_order_assets').insert({ id: randomUUID(), organization_id: orgA, client_id: clientA, work_order_id: workOrderA, asset_id: assetA });
      expect(link.error).not.toBeNull();
    });

    it('hides assets from clients and anonymous sessions', async () => {
      const client = await clientUserA.from('field_service_assets').select('id');
      expect(client.error).toBeNull();
      expect(client.data).toHaveLength(0);
      const clientLinks = await clientUserA.from('field_service_work_order_assets').select('id');
      expect(clientLinks.data ?? []).toHaveLength(0);
      const anonymous = await anon.from('field_service_assets').select('id');
      expect(anonymous.data ?? []).toHaveLength(0);
    });

    it('denies the organization once it is no longer a Field Service workspace', async () => {
      await sql`UPDATE organizations SET sector = 'health', profession = 'physiotherapist' WHERE id = ${orgA}`;
      try {
        const { data } = await proA.from('field_service_assets').select('id').eq('id', assetA);
        expect(data ?? []).toHaveLength(0);
      } finally {
        await sql`UPDATE organizations SET sector = 'field_services', profession = 'plumber' WHERE id = ${orgA}`;
      }
    });
  });
});
