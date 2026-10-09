// @vitest-environment node
import { provisionManagedFixture, runManagedFixture } from '../helpers/neon-managed-fixtures';
import { withFixtureMaintenance } from '../helpers/neon-fixtures';
import { beforeAll, afterAll, describe, expect, it as vitestIt } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { clientService } from '@/lib/services/client.service';
import { contactService } from '@/lib/services/contact.service';
import { dealService } from '@/lib/services/deal.service';
import { productService } from '@/lib/services/product.service';
import { taskService } from '@/lib/services/task.service';
import { invoiceService } from '@/lib/services/invoice.service';
import { requestService } from '@/lib/services/request.service';
const url = new URL(process.env.DATABASE_URL!);
if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production' || !url.hostname.endsWith('.neon.tech')) throw new Error('Isolated Neon test branch required');
const sql = postgres(url.toString());
const prefix = `immutable-${randomUUID()}`, orgA = prefix+'-a', orgB = prefix+'-b', pro = prefix+'-pro', proB=prefix+'-prob';
const ca=prefix+'-ca',cb=prefix+'-cb',ia=prefix+'-ia',pa=prefix+'-pa',pb=prefix+'-pb',da=prefix+'-da',cta=prefix+'-cta',ta=prefix+'-ta',ra=prefix+'-ra';
const cases = [
  { table:'clients',id:ca,call:(data:object) => clientService.update(ca,orgA,data,pro),normal:{name:'Changed client'} },
  { table:'contacts',id:cta,call:(data:object) => contactService.update(cta,orgA,data,pro),normal:{firstName:'Changed'},relation:{clientId:cb} },
  { table:'deals',id:da,call:(data:object) => dealService.update(da,orgA,data,pro),normal:{name:'Changed deal'},relation:{clientId:cb} },
  { table:'products',id:pa,call:(data:object) => productService.update(pa,orgA,data,pro),normal:{name:'Changed product'} },
  { table:'tasks',id:ta,call:(data:object) => taskService.update(ta,orgA,data,pro),normal:{title:'Changed task'},relation:{assignedTo:proB} },
  { table:'invoices',id:ia,call:(data:object) => invoiceService.update(ia,orgA,data,pro),normal:{message:'Changed invoice'},relation:{clientId:cb} },
];
beforeAll(async () => {
  await sql`INSERT INTO organizations (id,name,created_at,updated_at) VALUES (${orgA},'Org A',now(),now()),(${orgB},'Org B',now(),now())`;
  await sql`INSERT INTO users (id,email,organization_id,profile_type,created_at,updated_at) VALUES (${pro},${pro+'@example.test'},${orgA},'professional',now(),now()),(${proB},${proB+'@example.test'},${orgB},'professional',now(),now())`;
  await sql`INSERT INTO clients (id,organization_id,name,created_at,updated_at) VALUES (${ca},${orgA},'Client A',now(),now()),(${cb},${orgB},'Client B',now(),now())`;
  await sql`INSERT INTO contacts (id,organization_id,client_id,first_name,last_name,email,phone,position,created_at,updated_at) VALUES (${cta},${orgA},${ca},'Contact','Test','contact@example.test','','',now(),now())`;
  await sql`INSERT INTO deals (id,organization_id,client_id,name,value,status,expected_close_date,created_at,updated_at) VALUES (${da},${orgA},${ca},'Deal',10,'prospect',now(),now(),now())`;
  await sql`INSERT INTO products (id,organization_id,name,unit_price,tax_rate,created_at,updated_at) VALUES (${pa},${orgA},'Product A',100,20,now(),now()),(${pb},${orgB},'Product B',100,20,now(),now())`;
  await sql`UPDATE products SET tax_rate=7.5 WHERE id=${pa}`;
  await sql`INSERT INTO tasks (id,organization_id,title,status,priority,created_at,updated_at) VALUES (${ta},${orgA},'Task','completed','high',now(),now())`;
  await sql`INSERT INTO invoices (id,organization_id,client_id,number,type,status,date,total_ht,tax_amount,total_ttc,created_at,updated_at) VALUES (${ia},${orgA},${ca},${ia},'invoice','draft',now(),0,0,0,now(),now())`;
  await sql`INSERT INTO requests (id,client_id,title,description,category,status,visibility,created_at,updated_at) VALUES (${ra},${pro},'Test request','Request description','test','draft','private',now(),now())`;
  await provisionManagedFixture(sql, pro);
});
afterAll(async () => {
  await withFixtureMaintenance(sql, async tx => {
    await tx`DELETE FROM requests WHERE id=${ra}`;
    for (const table of ['invoice_lines','invoices','tasks','products','deals','contacts','clients','users']) await tx`DELETE FROM ${sql(table)} WHERE organization_id IN (${orgA},${orgB})`;
    await tx`DELETE FROM organizations WHERE id IN (${orgA},${orgB})`;
  }); await sql.end();
});
async function row(table:string,id:string) { return (await sql`SELECT * FROM ${sql(table)} WHERE id=${id}`)[0]; }
const it = (title: string, work: () => Promise<void> | void) => vitestIt(title, () => runManagedFixture(pro, work));
describe('Core update strictness and tenant invariants', () => {
  for (const c of cases) {
    it(`${c.table}: permits an ordinary update`, async () => {
      const before=await row(c.table,c.id);
      await c.call(c.normal); const after=await row(c.table,c.id);
      const edited=new Set(Object.keys(c.normal).map(key=>key.replace(/[A-Z]/g,x=>'_'+x.toLowerCase())));
      for (const key of Object.keys(before)) if (key !== 'updated_at' && !edited.has(key)) expect(after[key]).toEqual(before[key]);
      expect(after.organization_id).toBe(orgA);
      for (const [key,value] of Object.entries(c.normal)) expect(after[key.replace(/[A-Z]/g,x=>'_'+x.toLowerCase())]).toBe(value);
    });
    for (const payload of [{organizationId:orgB},{id:'replacement'},{createdAt:'replaced'},{createdByUserId:proB},{userId:proB},{profileType:'professional'},{subscriptionTier:'business'}]) {
      it(`${c.table}: rejects ${Object.keys(payload)[0]} and preserves the DB row`, async () => {
        const before=await row(c.table,c.id);
        await expect(c.call(payload)).rejects.toBeDefined(); expect(await row(c.table,c.id)).toEqual(before);
      });
    }
    if (c.relation) it(`${c.table}: rejects cross-tenant relation without mutation`, async () => {
      const before=await row(c.table,c.id); await expect(c.call(c.relation!)).rejects.toMatchObject({statusCode:403}); expect(await row(c.table,c.id)).toEqual(before);
    });
  }
  it('tasks reject polymorphic cross-tenant links',async () => {
    const before=await row('tasks',ta); await expect(taskService.update(ta,orgA,{entityType:'client',entityId:cb},pro)).rejects.toMatchObject({statusCode:403}); expect(await row('tasks',ta)).toEqual(before);
  });
  it('invoice line product and structural IDs are checked before writes',async () => {
    const before=await row('invoices',ia);
    await expect(invoiceService.update(ia,orgA,{lines:[{description:'Foreign',quantity:1,unitPrice:100,taxRate:20,productId:pb}] as never},pro)).rejects.toMatchObject({statusCode:403});
    await expect(invoiceService.update(ia,orgA,{lines:[{description:'Forged',quantity:1,unitPrice:100,taxRate:20,organizationId:orgB}] as never},pro)).rejects.toBeDefined();
    expect(await row('invoices',ia)).toEqual(before); expect(await sql`SELECT * FROM invoice_lines WHERE invoice_id=${ia}`).toHaveLength(0);
  });
  it('invoice editable lines are calculated inside the transaction',async () => {
    const updated=await invoiceService.update(ia,orgA,{lines:[{description:'Service',quantity:2,unitPrice:100,taxRate:20,productId:pa}] as never},pro);
    expect(updated.totalTTC).toBe(240); expect((await row('invoices',ia)).total_ttc).toBe('240.00');
  });
  it('ordinary invoice update rejects paid/signature/document identity',async () => {
    for (const payload of [{status:'paid'},{type:'quote'},{number:'forged'},{recipientUserId:proB},{signature:'forged'}]) {
      const before=await row('invoices',ia); await expect(invoiceService.update(ia,orgA,payload as never,pro)).rejects.toBeDefined(); expect(await row('invoices',ia)).toEqual(before);
    }
  });
  it('request ownership fields are rejected explicitly; normal update is allowed',async () => {
    await requestService.update(ra,{title:'Changed request'},pro);
    for (const payload of [{clientId:proB},{organizationId:orgB},{id:'forged'}]) {
      const before=await row('requests',ra); await expect(requestService.update(ra,payload,pro)).rejects.toBeDefined(); expect(await row('requests',ra)).toEqual(before);
    }
  });
  it('issues a draft after calculating its lines and locks it',async () => {
    const issued=await invoiceService.update(ia,orgA,{status:'sent'},pro);
    expect(issued.status).toBe('sent'); expect(issued.lockedAt).toBeTruthy();
    expect(issued.totalTTC).toBe(240);
  });

});
