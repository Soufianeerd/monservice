// @vitest-environment node
import { provisionManagedFixture, runManagedFixture } from '../helpers/neon-managed-fixtures';
import { withFixtureMaintenance } from '../helpers/neon-fixtures';
import { beforeAll, afterAll, describe, expect, it as vitestIt, vi } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { quoteService } from '@/lib/services/quote.service';
import { invoiceService } from '@/lib/services/invoice.service';
import { requireClientBillingAuthority } from '@/lib/billing/authorization';
import { toClientBillingDTO } from '@/lib/data/dto/client-billing.dto';
import { acceptQuoteAction } from '@/app/actions/quote.actions';
import { AppError } from '@/lib/errors';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn(async () => { throw new AppError('Anonymous', 401); }) }));

// Refuse to mutate a remote database, including when .env.local is loaded by setup.
const url = new URL(process.env.DATABASE_URL!);
if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production' || !url.hostname.endsWith('.neon.tech')) throw new Error('Isolated Neon test branch required');
const sql = postgres(url.toString(), { max: 3 });
const prefix = `gate1-${randomUUID()}`;
const orgA = `${prefix}-a`, orgB = `${prefix}-b`;
const clientA = `${prefix}-ca`, clientA2 = `${prefix}-ca2`, clientB = `${prefix}-cb`;
const actorA = `${prefix}-ua`, actorA2 = `${prefix}-ua2`, actorB = `${prefix}-ub`, pro = `${prefix}-pro`;
let counter = 0;
async function quote(clientId = clientA, organizationId = orgA, recipientUserId: string | null = actorA) {
  const id = `${prefix}-q${++counter}`;
  await sql`INSERT INTO invoices (id,organization_id,client_id,recipient_user_id,created_by_user_id,number,type,status,date,total_ht,tax_amount,total_ttc,created_at,updated_at)
    VALUES (${id},${organizationId},${clientId},${recipientUserId},${organizationId === orgA ? pro : null},${id},'quote','sent',now(),100,20,120,now(),now())`;
  await sql`INSERT INTO invoice_lines (id,invoice_id,organization_id,description,quantity,unit_price,unit_cost,tax_rate,total_ht,total_ttc) VALUES (${id+'-line'},${id},${organizationId},'Service',1,100,42,20,100,120)`;
  return id;
}
async function snapshot() {
  return {
    invoices: await sql`SELECT * FROM invoices WHERE organization_id IN (${orgA},${orgB}) ORDER BY id`,
    deals: await sql`SELECT * FROM deals WHERE organization_id IN (${orgA},${orgB}) ORDER BY id`,
    workOrders: await sql`SELECT * FROM field_service_work_orders WHERE organization_id IN (${orgA},${orgB}) ORDER BY id`,
  };
}
beforeAll(async () => {
  await sql`INSERT INTO organizations (id,name,created_at,updated_at) VALUES (${orgA},'Gate A',now(),now()),(${orgB},'Gate B',now(),now())`;
  await sql`INSERT INTO users (id,email,profile_type,organization_id,subscription_tier,subscription_status,created_at,updated_at) VALUES
    (${actorA},${actorA+'@example.test'},'client',${orgA},'free','inactive',now(),now()),
    (${actorA2},${actorA2+'@example.test'},'client',${orgA},'free','inactive',now(),now()),
    (${actorB},${actorB+'@example.test'},'client',${orgB},'free','inactive',now(),now()),
    (${pro},${pro+'@example.test'},'professional',${orgA},'business','active',now(),now())`;
  await sql`INSERT INTO clients (id,organization_id,user_id,name,email,created_at,updated_at) VALUES
    (${clientA},${orgA},${actorA},'Client A','a@example.test',now(),now()),
    (${clientA2},${orgA},${actorA2},'Client A2','a2@example.test',now(),now()),
    (${clientB},${orgB},${actorB},'Client B','b@example.test',now(),now())`;
  await provisionManagedFixture(sql, actorA);
});
afterAll(async () => {
  await withFixtureMaintenance(sql, async tx => {
    for (const table of ['invoice_lines','invoices','clients','users']) await tx`DELETE FROM ${sql(table)} WHERE organization_id IN (${orgA},${orgB})`;
    await tx`DELETE FROM organizations WHERE id IN (${orgA},${orgB})`;
  });
  await sql.end();
});
const it = (title: string, work: () => Promise<void> | void) => vitestIt(title, () => runManagedFixture(actorA, work));
describe('Core client billing authorization and mutation effects', () => {
  it('reads the explicit recipient and CRM-linked recipient with safe DTOs', async () => {
    for (const recipient of [actorA, null]) {
      const id = await quote(clientA, orgA, recipient);
      const dto = await quoteService.getClientQuote(id, actorA);
      expect(dto?.id).toBe(id);
      expect(JSON.stringify(dto)).not.toMatch(/unitCost|margin|profit|createdByUserId/);
      expect(JSON.stringify(toClientBillingDTO((await invoiceService.getById(id))!))).not.toMatch(/unitCost|margin|profit/);
    }
  });
  for (const [label, client, org, recipient, actor] of [
    ['same tenant other client',clientA2,orgA,actorA2,actorA],
    ['other tenant',clientB,orgB,actorB,actorA],
    ['professional via client path',clientA,orgA,pro,pro],
    ['unknown user',clientA,orgA,actorA,'unknown'],
  ]) {
    for (const operation of ['read','accept','reject','view'] as const) it(`${operation}: denies ${label} with zero mutations`, async () => {
      const id = await quote(client,org,recipient);
      const before = await snapshot();
      const promise = operation === 'read' ? quoteService.getClientQuote(id,actor)
        : operation === 'accept' ? quoteService.acceptQuote(id,'signature',actor)
        : operation === 'reject' ? quoteService.rejectQuote(id,'No',actor) : quoteService.markQuoteViewed(id,actor);
      // RLS hides unauthorized rows. Read/view reveal no resource existence;
      // mutations return 404 for hidden rows, and actor mismatch remains 403.
      const hidden = label === 'same tenant other client' || label === 'other tenant';
      if (hidden && operation === 'read') await expect(promise).resolves.toBeNull();
      else if (hidden && operation === 'view') await expect(promise).resolves.toBeUndefined();
      else await expect(promise).rejects.toMatchObject({ statusCode: hidden ? 404 : 403 });
      expect(await snapshot()).toEqual(before);
    });
  }
  it('accepts and rejects the legitimate recipient', async () => {
    const accepted = await quote();
    expect((await quoteService.acceptQuote(accepted,'signature',actorA)).status).toBe('accepted');
    const rejected = await quote();
    expect((await quoteService.rejectQuote(rejected,'No',actorA)).status).toBe('rejected');
    expect((await sql`SELECT * FROM field_service_work_orders WHERE organization_id=${orgA}`).length).toBe(0);
  });
  for (const status of ['paid','accepted','superseded','invalid']) it(`legacy rejects ${status} without mutation`, async () => {
    const id = await quote(); const before = await snapshot();
    await expect(invoiceService.updateStatusAsClient(id,actorA,status as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(await snapshot()).toEqual(before);
  });
  it('anonymous action fails before any mutation', async () => {
    const id = await quote(); const before = await snapshot();
    await expect(acceptQuoteAction({ quoteId: id, signatureData: 'signature' } as never)).rejects.toMatchObject({ statusCode: 401 });
    expect(await snapshot()).toEqual(before);
  });
  it('does not authorize by tenant alone', async () => {
    await expect(requireClientBillingAuthority({ organizationId: orgA,clientId:clientA2 },actorA)).rejects.toMatchObject({ statusCode:403 });
  });
});
