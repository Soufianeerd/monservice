// @vitest-environment node
import { provisionManagedFixture, selectManagedFixture, runManagedFixture } from '../helpers/neon-managed-fixtures';
import { withFixtureMaintenance } from '../helpers/neon-fixtures';
import { beforeAll,afterAll,describe,it as vitestIt,expect,vi } from 'vitest';
import postgres from 'postgres';
import { createSecurityScopedClient } from '@/lib/db/security-context';
import { getTestProviderSession } from '../helpers/neon-auth-context';
import { randomUUID } from 'node:crypto';
import { exportMyDataAction,exportOrganizationDataAction,deleteMyAccountAction } from '@/app/actions/gdpr.actions';
import { requireSession,type SessionContext } from '@/lib/auth/session';
import { requireClientBillingAuthority } from '@/lib/billing/authorization';
import { AppError } from '@/lib/errors';
vi.mock('@/lib/auth/session',()=>({requireSession:vi.fn()}));
const signOut=vi.hoisted(()=>vi.fn(async()=>({error:null})));
vi.mock('@/lib/auth/server', async () => { const { getTestProviderSession } = await import('../helpers/neon-auth-context'); return { auth: { getSession: getTestProviderSession, signOut } }; });
const url=new URL(process.env.DATABASE_URL!);
if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production' || !url.hostname.endsWith('.neon.tech')) throw new Error('Isolated Neon test branch required');
const sql=postgres(url.toString(),{max:3});
const runtime = postgres(process.env.NEON_RUNTIME_DATABASE_URL!, { max: 1, prepare: false });
const scoped = createSecurityScopedClient(runtime, async () => (await getTestProviderSession()).data?.user.id ?? null);
const org=randomUUID(),otherOrg=randomUUID(), ca=randomUUID(),cb=randomUUID(), invA=randomUUID(),invB=randomUUID(),role=randomUUID(),perm=randomUUID();
const actors=Object.fromEntries(['client','staff','professional','owner','admin','other'].map(label=>[label,randomUUID()]));
function ctx(label:string):SessionContext {return {userId:actors[label],organizationId:label==='other'?otherOrg:org,profileType:label==='client'||label==='other'?'client':'professional',email:actors[label]+'@example.test'};}
function session(label:string) {selectManagedFixture(actors[label]);vi.mocked(requireSession).mockResolvedValue(ctx(label));}
async function assets() {
  const result:Record<string,unknown>={};
  for(const table of ['organizations','clients','contacts','deals','products','tasks','invoices','invoice_lines','messages','requests','practice_practitioners']) {
    result[table]=table==='organizations' ? await sql`SELECT * FROM organizations WHERE id=${org}`
      : table==='requests' ? await sql`SELECT * FROM requests WHERE client_id IN (${actors.client},${actors.other}) ORDER BY id`
      : await sql`SELECT * FROM ${sql(table)} WHERE organization_id=${org} ORDER BY id`;
  } return result;
}
beforeAll(async()=>{
  await sql`INSERT INTO organizations (id,name,created_at,updated_at) VALUES (${org},'Private org',now(),now()),(${otherOrg},'Other org',now(),now())`;
  for(const label of Object.keys(actors)) {const c=ctx(label); await sql`INSERT INTO users (id,email,name,profile_type,organization_id,created_at,updated_at) VALUES (${c.userId},${c.email},${label},${c.profileType},${c.organizationId},now(),now())`;}
  await sql`INSERT INTO clients (id,organization_id,user_id,name,email,notes,created_at,updated_at) VALUES (${ca},${org},${actors.client},'Subject','subject@example.test','INTERNAL CRM',now(),now()),(${cb},${org},${actors.other},'Other client','other@example.test','OTHER PRIVATE',now(),now())`;
  await sql`INSERT INTO contacts (id,organization_id,client_id,first_name,last_name,email,phone,position,created_at,updated_at) VALUES (${randomUUID()},${org},${cb},'Other','Contact','other@example.test','','',now(),now())`;
  await sql`INSERT INTO deals (id,organization_id,client_id,name,value,status,expected_close_date,created_at,updated_at) VALUES (${randomUUID()},${org},${cb},'Private deal',100,'prospect',now(),now(),now())`;
  await sql`INSERT INTO products (id,organization_id,name,unit_price,tax_rate,created_at,updated_at) VALUES (${randomUUID()},${org},'Private product',100,20,now(),now())`;
  await sql`INSERT INTO tasks (id,organization_id,title,status,priority,created_at,updated_at) VALUES (${randomUUID()},${org},'Private task','todo','medium',now(),now())`;
  for(const [id,client,user] of [[invA,ca,actors.client],[invB,cb,actors.other]]) {
    await sql`INSERT INTO invoices (id,organization_id,client_id,recipient_user_id,number,type,status,date,total_ht,tax_amount,total_ttc,signature,created_at,updated_at) VALUES (${id},${org},${client},${user},${id},'invoice','draft',now(),100,20,120,'KEEP SIGNATURE',now(),now())`;
    await sql`INSERT INTO invoice_lines (id,organization_id,invoice_id,description,quantity,unit_price,unit_cost,tax_rate,total_ht,total_ttc) VALUES (${randomUUID()},${org},${id},'Service',1,100,42,20,100,120)`;
  }
  for(const user of [actors.client,actors.other]) await sql`INSERT INTO requests (id,client_id,title,description,category,status,visibility,created_at,updated_at) VALUES (${randomUUID()},${user},'Private request','Private description','test','draft','private',now(),now())`;
  await sql`INSERT INTO messages (id,organization_id,sender_id,receiver_id,content,created_at,updated_at) VALUES (${randomUUID()},${org},${actors.client},${actors.professional},'Subject message',now(),now()),(${randomUUID()},${org},${actors.other},${actors.professional},'Other private message',now(),now())`;
  // An owner/practitioner FK makes deleting/detaching the user unsafe for retention.
  await sql`INSERT INTO practice_practitioners (id,organization_id,user_id,display_name,profession) VALUES (${randomUUID()},${org},${actors.owner},'Owner practitioner','physiotherapist')`;
  await sql`INSERT INTO roles (id,name) VALUES (${role},${'gate-privacy-'+role})`;
  await sql`INSERT INTO permissions (id,name,resource,action) VALUES (${perm},'privacy:export','privacy','export') ON CONFLICT (name) DO NOTHING`;
  const [permission]=await sql`SELECT id FROM permissions WHERE name='privacy:export'`;
  await sql`INSERT INTO role_permissions (id,role_id,permission_id) VALUES (${randomUUID()},${role},${permission.id})`;
  for(const label of ['owner','admin','other']) await sql`INSERT INTO user_roles (id,user_id,role_id,organization_id) VALUES (${randomUUID()},${actors[label]},${role},${label==='other'?otherOrg:org})`;
  for (const actor of Object.values(actors)) await provisionManagedFixture(sql, actor);
});
afterAll(async()=>{
  await withFixtureMaintenance(sql, async tx => {
    for(const table of ['user_roles','practice_practitioners','invoice_lines','invoices','tasks','products','deals','contacts','clients','messages','users']) await tx`DELETE FROM ${sql(table)} WHERE organization_id IN (${org},${otherOrg})`;
    await tx`DELETE FROM requests WHERE client_id IN (${actors.client},${actors.other})`;
    await tx`DELETE FROM role_permissions WHERE role_id=${role}`; await tx`DELETE FROM roles WHERE id=${role}`; await tx`DELETE FROM permissions WHERE id=${perm}`;
    await tx`DELETE FROM organizations WHERE id IN (${org},${otherOrg})`;
  });await sql.end();await runtime.end();
});
const it = (title: string, work: () => Promise<void> | void) => vitestIt(title, () => runManagedFixture(actors.client, work));
describe('Personal privacy operations cannot operate on organization lifecycle',()=>{
  it('client personal export contains only subject data and safe recipient documents',async()=>{
    session('client'); const before=await assets(); const payload=JSON.parse((await exportMyDataAction()).data);
    expect(payload.organisation).toBeUndefined(); expect(payload.documents.map((d:{id:string})=>d.id)).toEqual([invA]);
    expect(payload.demandes).toHaveLength(1); expect(payload.messages).toHaveLength(1);
    expect(JSON.stringify(payload)).not.toMatch(/unitCost|OTHER PRIVATE|Other private|INTERNAL CRM|Private deal|Private product|Private task/);
    expect(await assets()).toEqual(before);
  });
  for(const label of ['staff','professional','owner','admin']) it(`${label}: personal export never implicitly includes organization`,async()=>{
    session(label);expect(JSON.parse((await exportMyDataAction()).data).organisation).toBeUndefined();
  });
  for(const label of ['client','staff','professional']) it(`${label}: organization export requires explicit permission`,async()=>{
    session(label);const before=await assets();await expect(exportOrganizationDataAction()).rejects.toMatchObject({statusCode:403});expect(await assets()).toEqual(before);
  });
  it('an explicit org-scoped RBAC grant enables organization export',async()=>{
    session('admin');const result=JSON.parse((await exportOrganizationDataAction()).data);
    expect(result.organisation.profil.id).toBe(org);expect(result.organisation.documents).toHaveLength(2);
  });
  it('a grant in another tenant does not authorize the professional here',async()=>{
    await sql`INSERT INTO user_roles (id,user_id,role_id,organization_id) VALUES (${randomUUID()},${actors.professional},${role},${otherOrg})`;
    session('professional');await expect(exportOrganizationDataAction()).rejects.toMatchObject({statusCode:403});
  });
  it('incorrect email and anonymous actions produce zero mutations',async()=>{
    session('client');const before=await assets();expect((await deleteMyAccountAction('wrong@example.test')).success).toBe(false);
    expect((await sql`SELECT account_closed_at FROM users WHERE id=${actors.client}`)[0].account_closed_at).toBeNull();
    vi.mocked(requireSession).mockRejectedValue(new AppError('Anonymous',401));
    await expect(exportMyDataAction()).rejects.toMatchObject({statusCode:401});
    await expect(deleteMyAccountAction('anything')).rejects.toMatchObject({statusCode:401});expect(await assets()).toEqual(before);
  });
  for(const label of ['client','staff','professional','owner','admin']) it(`${label}: account closure preserves every org asset and retained reference`,async()=>{
    session(label);const before=await assets();expect(await deleteMyAccountAction(ctx(label).email!)).toEqual({success:true});
    expect(await assets()).toEqual(before);
    const [subject]=await sql`SELECT * FROM users WHERE id=${actors[label]}`;
    expect(subject.account_closed_at).toBeTruthy();expect(subject.organization_id).toBe(org);expect(subject.name).toBe('Compte fermé');
    expect(await sql`SELECT * FROM user_roles WHERE user_id=${actors[label]}`).toHaveLength(0);
    await scoped.begin(async tx=>{
      expect((await tx`SELECT public.current_account_is_active() AS active`)[0].active).toBe(false);
      for(const table of ['invoices','clients','users','organizations']) expect(await tx`SELECT id FROM ${sql(table)} WHERE ${sql(table==='organizations'?'id':'organization_id')}=${org}`).toHaveLength(0);
      expect(await tx`UPDATE users SET account_closed_at=NULL WHERE id=${actors[label]} RETURNING id`).toHaveLength(0);
    });
    await expect(requireClientBillingAuthority({organizationId:org,clientId:ca,recipientUserId:actors[label]},actors[label])).rejects.toMatchObject({statusCode:403});
  });
  it('an active authenticated account cannot write its lifecycle marker',async()=>{
    session('other');
    await scoped.begin(async tx=>{
      expect((await tx`SELECT public.current_account_is_active() AS active`)[0].active).toBe(true);
    });
    await expect(scoped.begin(async tx => {
      await tx`UPDATE users SET account_closed_at=now() WHERE id=${actors.other}`;
    })).rejects.toMatchObject({ code: '42501' });
    expect((await sql`SELECT account_closed_at FROM users WHERE id=${actors.other}`)[0].account_closed_at).toBeNull();
  });
  it('bearer-token users cannot bypass RLS through the sequence allocator RPC',async()=>{
    session('other');
    await expect(sql.begin(async tx=>{
      await tx`SELECT set_config('monservice.provider_user_id',(SELECT provider_user_id FROM public.user_identities WHERE app_user_id=${actors.other}),true)`;
      await tx`SET LOCAL ROLE monservice_runtime`;
      await tx`SELECT public.allocate_billing_document_number(${org},'invoice',2026)`;
    })).rejects.toMatchObject({code:'42501'});
    expect(await sql`SELECT * FROM billing_document_sequences WHERE organization_id=${org}`).toHaveLength(0);
  });
  it('restrictive RLS guards cover every currently permissive public/storage table',async()=>{
    const missing=await sql`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relrowsecurity AND c.relkind='r' AND (n.nspname='public' OR (n.nspname='storage' AND c.relname='objects')) AND EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polpermissive AND (SELECT oid FROM pg_roles WHERE rolname='monservice_runtime')=ANY(p.polroles)) AND NOT EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname='account_active_required' AND NOT p.polpermissive)`;
    expect(missing).toHaveLength(0);
  });
});
