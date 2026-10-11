import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createSecurityScopedClient } from '@/lib/db/security-context';
import { objectStore } from '@/lib/storage/neon-object-store';
import { randomUUID } from 'node:crypto';

const runtime = postgres(process.env.NEON_RUNTIME_DATABASE_URL!, { max: 1, prepare: false });
const admin = postgres(process.env.NEON_ADMIN_DATABASE_URL!, { max: 1, prepare: false });
const stripe = postgres(process.env.NEON_STRIPE_DATABASE_URL!, { max: 1, prepare: false });
const reminders = postgres(process.env.NEON_REMINDERS_DATABASE_URL!, { max: 1, prepare: false });
let actorA: { provider: string; app: string; org: string; sessionId: string; cookie: string };
let actorB: typeof actorA;
const anonymous = createSecurityScopedClient(runtime, async () => null);
const identity = (actor: typeof actorA) => createSecurityScopedClient(runtime, async () => actor.provider);
const worker = (client: postgres.Sql, role: string, subject='',event='') => createSecurityScopedClient(client,async()=>null,()=>({ client,role,settings:{ 'monservice.worker_subject_id':subject,'monservice.worker_event_id':event } }));
async function login(email: string) {
  const base=process.env.NEON_AUTH_BASE_URL!;
  const response=await fetch(base+'/sign-in/email',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost:3039'},body:JSON.stringify({email,password:process.env.E2E_AUTH_PASSWORD})});
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const code = typeof result.code === 'string' && /^[A-Z_]+$/.test(result.code) ? result.code : 'UNKNOWN';
    throw new Error(`Managed fixture sign-in failed: HTTP ${response.status}, ${code}`);
  }
  const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const verified=await fetch(base+'/get-session',{headers:{cookie}});
  const session=await verified.json();
  if (!verified.ok || !session?.user?.id) throw new Error(`Real managed Auth session required: HTTP ${verified.status}`);
  const [mapping]=await admin`select i.app_user_id as app,u.organization_id as org from public.user_identities i join public.users u on u.id=i.app_user_id where i.provider='neon' and i.provider_user_id=${session.user.id}`;
  if (!mapping) throw new Error('Stable fixture mapping missing');
  return {provider:session.user.id,app:mapping.app,org:mapping.org,sessionId:session.session.id,cookie};
}
beforeAll(async()=>{
  if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production') throw new Error('Synthetic branch required');
  actorA=await login('pro_generic_a@monservice.invalid'); actorB=await login('pro_generic_b@monservice.invalid');
},60_000);
afterAll(async()=>{await Promise.all([runtime.end(),admin.end(),stripe.end(),reminders.end()]);});

describe('Neon pooled transaction and worker boundaries',()=>{
  it('concurrent actors and anonymous queries never share pooled identity',async()=>{
    const queries=Array.from({length:18},(_,index)=>{
      const actor=index%3===0?null:index%3===1?actorA:actorB;
      const scoped=actor?identity(actor):anonymous;
      return scoped.unsafe('select public.current_app_user_id() as id,public.current_organization_id() as org').then(rows=>{
        expect(rows[0].id).toBe(actor?.app??null); expect(rows[0].org).toBe(actor?.org??null);
      });
    }); await Promise.all(queries);
  });
  it('rollback and nested savepoints retain one actor and clear settings at commit',async()=>{
    const scoped=identity(actorA);
    await expect(scoped.begin(async()=>{await scoped.unsafe('select public.current_app_user_id()');throw new Error('rollback probe');})).rejects.toThrow('rollback probe');
    await scoped.begin(async()=>{
      await expect(scoped.begin(async()=>{throw new Error('savepoint probe');})).rejects.toThrow('savepoint probe');
      const rows=await scoped.unsafe('select public.current_app_user_id() as id');expect(rows[0].id).toBe(actorA.app);
    });
    const [row]=await runtime`select nullif(current_setting('monservice.provider_user_id',true),'') as id`;
    expect(row.id).toBeNull();
    expect((await anonymous.unsafe('select public.current_app_user_id() as id'))[0].id).toBeNull();
  });
  it('rejects owner connections and authority changes within a transaction',async()=>{
    await expect(createSecurityScopedClient(admin,async()=>actorA.provider).unsafe('select 1')).rejects.toThrow('Unsafe database runtime role');
    await expect(identity(actorA).begin(async()=>{await worker(stripe,'monservice_stripe').unsafe('select 1');})).rejects.toThrow('Cross-authority transaction denied');
  });
  it('provisioning cannot choose a foreign provider ID or invoke its internal capability',async()=>{
    await expect(identity(actorA).unsafe('select public.provision_app_user($1)',[actorB.provider])).rejects.toMatchObject({code:'42501'});
    await expect(anonymous.unsafe('select public.provision_app_user($1)',[actorA.provider])).rejects.toMatchObject({code:'42501'});
    await expect(identity(actorA).unsafe('select public.provision_app_user_internal($1)',[actorA.provider])).rejects.toMatchObject({code:'42501'});
    expect((await identity(actorA).unsafe('select public.provision_app_user(null) as id'))[0].id).toBe(actorA.app);
  });
  it('Stripe worker limits user writes to verified subject and event idempotence to its event',async()=>{
    const event='evt_test_'+randomUUID();
    const scoped=worker(stripe,'monservice_stripe',actorA.app,event);
    expect((await scoped.unsafe('select id from public.users')).map(row=>row.id)).toEqual([actorA.app]);
    expect(await scoped.unsafe('update public.users set updated_at=$1 where id=$2 returning id',[new Date().toISOString(),actorB.app])).toHaveLength(0);
    await expect(scoped.unsafe('select email from public.users')).rejects.toMatchObject({code:'42501'});
    await expect(scoped.unsafe('update public.users set organization_id=$1 where id=$2',[actorB.org,actorA.app])).rejects.toMatchObject({code:'42501'});
    await expect(scoped.unsafe('select * from public.clinical_notes')).rejects.toMatchObject({code:'42501'});
    await scoped.unsafe('insert into public.stripe_events(id,type,processed_at) values($1,$2,$3)',[event,'migration.synthetic',new Date().toISOString()]);
    await expect(worker(stripe,'monservice_stripe',actorA.app,'evt_foreign').unsafe('select id from public.stripe_events where id=$1',[event])).resolves.toHaveLength(0);
    await expect(scoped.unsafe('insert into public.stripe_events(id,type,processed_at) values($1,$2,$3)',['evt_other','migration.synthetic',new Date().toISOString()])).rejects.toMatchObject({code:'42501'});
    await scoped.unsafe('delete from public.stripe_events where id=$1',[event]);
  });
  it('reminder worker can read logistics but cannot read clinical or identity fields',async()=>{
    const scoped=worker(reminders,'monservice_reminders');
    expect((await scoped.unsafe('select id,name from public.organizations limit 1')).length).toBe(1);
    await expect(scoped.unsafe('select birth_date from public.patient_profiles')).rejects.toMatchObject({code:'42501'});
    await expect(scoped.unsafe('select * from public.clinical_documents')).rejects.toMatchObject({code:'42501'});
    await expect(scoped.unsafe('update public.users set subscription_tier=$1',['pro'])).rejects.toMatchObject({code:'42501'});
  });
  it('private transport preserves bytes, denies overwrite and expires a signed URL',async()=>{
    const key='synthetic-boundary/'+randomUUID()+'.txt';const content=Buffer.from('Neon synthetic checksum probe');
    try {
      await objectStore.put('einvoices',key,content,'text/plain');
      expect(await objectStore.read('einvoices',key)).toEqual(content);
      await expect(objectStore.put('einvoices',key,Buffer.from('overwrite'),'text/plain')).rejects.toThrow();
      expect(await objectStore.read('einvoices',key)).toEqual(content);
      const url=await objectStore.presign('einvoices',key,1);
      expect((await fetch(url)).status).toBe(200);
      await new Promise(resolve=>setTimeout(resolve,2100));
      expect((await fetch(url)).ok).toBe(false);
      await expect(objectStore.presign('einvoices',key,61)).rejects.toThrow('Invalid private download lifetime');
    } finally {await objectStore.removeOrphan('einvoices',key);}
  },20_000);
  it('live session check refuses a foreign binding, then refuses the same signed session after real logout',async()=>{
    const scoped=identity(actorA);
    expect((await scoped.unsafe('select public.provider_session_is_active($1,$2) as active',[actorA.provider,actorA.sessionId]))[0].active).toBe(true);
    expect((await scoped.unsafe('select public.provider_session_is_active($1,$2) as active',[actorB.provider,actorA.sessionId]))[0].active).toBe(false);
    const response=await fetch(process.env.NEON_AUTH_BASE_URL+'/sign-out',{method:'POST',headers:{cookie:actorA.cookie,origin:'http://localhost:3039','content-type':'application/json'},body:'{}'});
    expect(response.ok).toBe(true);
    expect((await scoped.unsafe('select public.provider_session_is_active($1,$2) as active',[actorA.provider,actorA.sessionId]))[0].active).toBe(false);
  });
});
