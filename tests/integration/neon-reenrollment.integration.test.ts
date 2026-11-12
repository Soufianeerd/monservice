import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createSecurityScopedClient } from '@/lib/db/security-context';

const admin=postgres(process.env.NEON_ADMIN_DATABASE_URL!,{max:1});
const runtime=postgres(process.env.NEON_RUNTIME_DATABASE_URL!,{max:1,prepare:false});
const base=process.env.NEON_AUTH_BASE_URL!;
const headers={'content-type':'application/json',origin:'http://localhost:3039'};
const appId=randomUUID();const ghost=randomUUID();const email=`reenrollment-${randomUUID()}@monservice.invalid`;
let providerId='';let recoveredOrg='';
const scoped=createSecurityScopedClient(runtime,async()=>providerId);
const request=async(path: string,body: object)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});
afterAll(async()=>{
  await admin`delete from public.user_identities where app_user_id=${appId}`;
  await admin`delete from public.identity_reenrollments where app_user_id=${appId}`;
  await admin`delete from public.users where id=${appId}`;
  if(recoveredOrg)await admin`delete from public.organizations where id=${recoveredOrg}`;
  await Promise.all([runtime.end(),admin.end()]);
});

describe('Controlled source identity recovery with managed Auth',()=>{
  it('denies an unverified email, verifies real OTP, preserves the stable ID/profile and creates only an own missing workspace',async()=>{
    if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH==='production')throw new Error('Synthetic branch required');
    // Match the production import: a management-created account has no
    // transferred password and starts with an unverified email.
    const branchResult=spawnSync('neon',['branches','get',process.env.NEON_BRANCH!,'--project-id','misty-field-54835523','-o','json'],{encoding:'utf8'});
    if(branchResult.status!==0)throw new Error('Synthetic branch lookup unavailable');
    const branch=JSON.parse(branchResult.stdout);
    // The management API occasionally refuses the first call on a branch whose
    // Auth service was provisioned minutes ago: retry, and report why it failed.
    const createAccount=()=>spawnSync('neon',['api',`/projects/misty-field-54835523/branches/${branch.id}/auth/users`,'-X','POST','-F',`email=${email}`,'-F','name=Synthetic migrated professional'],{encoding:'utf8'});
    let created=createAccount();
    for(let attempt=1;created.status!==0&&attempt<3;attempt++){
      await new Promise(resolve=>setTimeout(resolve,10_000));
      created=createAccount();
    }
    if(created.status!==0)throw new Error(`Synthetic management account creation unavailable: ${String(created.stderr||created.stdout||created.error?.message||'no output').replace(/\s+/g,' ').slice(0,300)}`);
    providerId=JSON.parse(created.stdout).id;
    const [provider]=await admin`select "emailVerified" from neon_auth."user" where id=${providerId}`;
    expect(provider.emailVerified).toBe(false);
    expect((await admin`select id from neon_auth.account where "userId"=${providerId} and password is not null`)).toHaveLength(0);
    const now=new Date().toISOString();
    await admin`insert into public.users(id,email,name,profile_type,organization_id,created_at,updated_at) values(${appId},${email},'Synthetic migrated professional','professional',${ghost},${now},${now})`;
    await admin`insert into public.identity_reenrollments(app_user_id,verified_source_email,source_provider_user_id) values(${appId},${email},${randomUUID()})`;
    expect((await scoped.unsafe('select public.provision_app_user(null) as id'))[0].id).toBeNull();
    expect((await scoped.unsafe('select public.current_app_user_id() as id'))[0].id).toBeNull();
    expect((await request('/email-otp/verify-email',{email,otp:'invalid'})).ok).toBe(false);
    const sent=await request('/email-otp/send-verification-otp',{email,type:'email-verification'});
    if(!sent.ok)throw new Error('Synthetic OTP issuance unavailable');
    // Delivery is deliberately not a real mailbox. The test owner reads only
    // this reserved-address fixture's verification hash to obtain its issued
    // six-digit code. Production has no owner connection or this capability.
    const [verification]=await admin`select value from neon_auth.verification where identifier like ${'%'+email+'%'} order by "createdAt" desc limit 1`;
    const hash=verification?.value.split(':')[0];let otp='';
    for(let value=0;value<1_000_000;value++){
      const candidate=String(value).padStart(6,'0');
      if(createHash('sha256').update(candidate).digest('base64url')===hash){otp=candidate;break;}
    }
    if(!otp)throw new Error('Managed synthetic OTP format changed');
    expect((await request('/email-otp/verify-email',{email,otp})).ok).toBe(true);
    expect((await scoped.unsafe('select public.link_current_reenrollment() as id'))[0].id).toBe(appId);
    expect((await scoped.unsafe('select public.provision_app_user(null,$1) as id',['client']))[0].id).toBe(appId);
    const [before]=await admin`select profile_type,organization_id from public.users where id=${appId}`;
    expect(before.profile_type).toBe('professional');expect(before.organization_id).toBe(ghost);
    recoveredOrg=(await scoped.unsafe('select public.recover_current_workspace($1,$2,$3) as id',['Synthetic own workspace','other',null]))[0].id;
    expect(recoveredOrg).not.toBe(ghost);
    expect((await scoped.unsafe('select public.recover_current_workspace($1,$2,$3) as id',['Ignored repeated name','other',null]))[0].id).toBe(recoveredOrg);
    const [after]=await admin`select id,profile_type,subscription_tier,organization_id from public.users where id=${appId}`;
    expect(after).toMatchObject({id:appId,profile_type:'professional',subscription_tier:'free',organization_id:recoveredOrg});
    // Password reset uses the actual managed token and API, never a dummy link.
    expect((await request('/request-password-reset',{email,redirectTo:'http://localhost:3039/reset-password'})).ok).toBe(true);
    const [reset]=await admin`select identifier from neon_auth.verification where value=${providerId} and identifier like 'reset-password:%' order by "createdAt" desc limit 1`;
    if(!reset)throw new Error('Managed reset token missing');
    const token=reset.identifier.slice('reset-password:'.length);const password=randomUUID()+'Aa1!';
    expect((await request('/reset-password',{token,newPassword:password})).ok).toBe(true);
    expect((await admin`select id from neon_auth.account where "userId"=${providerId} and "providerId"='credential'`)).toHaveLength(1);
    expect((await request('/reset-password',{token,newPassword:password})).ok).toBe(false);
    expect((await request('/sign-in/email',{email,password})).ok).toBe(true);
    expect((await request('/sign-in/email',{email,password:process.env.E2E_AUTH_PASSWORD})).ok).toBe(false);
  },90_000);
});
