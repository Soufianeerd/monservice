// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { createSecurityScopedClient } from '@/lib/db/security-context';
import { provisionManagedFixture, runManagedFixture } from '../helpers/neon-managed-fixtures';
import { getTestProviderSession } from '../helpers/neon-auth-context';

if(!process.env.NEON_BRANCH||process.env.NEON_BRANCH==='production')throw new Error('Synthetic branch required');
const admin=postgres(process.env.NEON_ADMIN_DATABASE_URL!,{max:1});
const runtime=postgres(process.env.NEON_RUNTIME_DATABASE_URL!,{max:1,prepare:false});
const scoped=createSecurityScopedClient(runtime,async()=>(await getTestProviderSession()).data?.user.id??null);
const org=randomUUID(),otherOrg=randomUUID(),professional=randomUUID(),client=randomUUID(),other=randomUUID(),closed=randomUUID();
const tables=['audit_logs','consent_events','data_subject_requests','processing_activities'];
beforeAll(async()=>{
  await admin`insert into public.organizations(id,name,created_at,updated_at) values(${org},'Synthetic compliance A',now(),now()),(${otherOrg},'Synthetic compliance B',now(),now())`;
  for(const [id,organization,profile]of [[professional,org,'professional'],[client,org,'client'],[other,otherOrg,'professional'],[closed,org,'professional']]){
    await admin`insert into public.users(id,email,name,profile_type,organization_id,created_at,updated_at) values(${id},${id+'@monservice.invalid'},'Synthetic compliance',${profile},${organization},now(),now())`;
    await provisionManagedFixture(admin,id);
  }
  await admin`update public.users set account_closed_at=now() where id=${closed}`;
  for(const [user,organization]of [[professional,org],[client,org],[other,otherOrg],[closed,org]]){
    await admin`insert into public.audit_logs(id,user_id,organization_id,action,entity_type,entity_id) values(${randomUUID()},${user},${organization},'fixture','fixture','fixture')`;
    await admin`insert into public.consent_events(id,user_id,organization_id,consent_type,consent_value) values(${randomUUID()},${user},${organization},'fixture','true')`;
    await admin`insert into public.data_subject_requests(id,user_id,organization_id,request_type,status) values(${randomUUID()},${user},${organization},'ACCESS','RECEIVED')`;
  }
  for(const organization of [org,otherOrg])await admin`insert into public.processing_activities(id,organization_id,name,purpose) values(${randomUUID()},${organization},'Synthetic register','Fixture')`;
},90_000);
afterAll(async()=>{
  for(const table of tables)await admin`delete from ${admin(table)} where organization_id in (${org},${otherOrg})`;
  await admin`delete from public.user_identities where app_user_id in (${professional},${client},${other},${closed})`;
  await admin`delete from public.users where id in (${professional},${client},${other},${closed})`;
  await admin`delete from public.organizations where id in (${org},${otherOrg})`;
  await Promise.all([admin.end(),runtime.end()]);
});
describe('Compliance RLS on the actual restricted runtime',()=>{
  it('enables RLS for every public table, including compliance and reference tables',async()=>{
    expect((await admin`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`)).toHaveLength(0);
  });
  it('professional can read own tenant records while another tenant remains invisible',()=>runManagedFixture(professional,()=>scoped.begin(async tx=>{
    for(const table of tables){
      const rows=await tx`select organization_id from ${tx(table)} where organization_id in (${org},${otherOrg})`;
      expect(rows.length).toBeGreaterThan(0);expect(rows.every(row=>row.organization_id===org)).toBe(true);
    }
  })));
  it('client sees only personal audit, consent and DSAR records, and no tenant register',()=>runManagedFixture(client,()=>scoped.begin(async tx=>{
    for(const table of tables.slice(0,3))expect(await tx`select user_id from ${tx(table)} where organization_id in (${org},${otherOrg})`).toEqual([{user_id:client}]);
    expect(await tx`select id from public.processing_activities where organization_id=${org}`).toHaveLength(0);
  })));
  it('closed account cannot read compliance records even with a live provider session',()=>runManagedFixture(closed,()=>scoped.begin(async tx=>{
    for(const table of tables)expect(await tx`select id from ${tx(table)} where organization_id=${org}`).toHaveLength(0);
  })));
  it('allows own consent and audit inserts, denies forged subjects and foreign tenant writes',()=>runManagedFixture(client,async()=>{
    await scoped.begin(async tx=>{
      await tx`insert into public.consent_events(id,user_id,organization_id,consent_type,consent_value) values(${randomUUID()},${client},${org},'own','true')`;
      await tx`insert into public.audit_logs(id,user_id,organization_id,action,entity_type,entity_id) values(${randomUUID()},${client},${org},'own','own','own')`;
    });
    await expect(scoped.begin(async tx=>{await tx`insert into public.consent_events(id,user_id,organization_id,consent_type,consent_value) values(${randomUUID()},${professional},${org},'forged','true')`;})).rejects.toMatchObject({code:'42501'});
    await expect(scoped.begin(async tx=>{await tx`insert into public.audit_logs(id,user_id,organization_id,action,entity_type,entity_id) values(${randomUUID()},${client},${otherOrg},'forged','forged','forged')`;})).rejects.toMatchObject({code:'42501'});
    await expect(scoped.begin(async tx=>{await tx`insert into public.processing_activities(id,organization_id,name,purpose) values(${randomUUID()},${org},'forged','forged')`;})).rejects.toMatchObject({code:'42501'});
  }));
});
