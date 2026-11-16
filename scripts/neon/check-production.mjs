// Read-only production checks. No seed, browser signup, account close or upload.
import fs from 'node:fs';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { S3Client,ListObjectsV2Command } from '@aws-sdk/client-s3';
import { spawnSync } from 'node:child_process';
const adminFile='.env.neon-production-admin.local',runtimeFile='.env.neon-production.local';
const admin=dotenv.parse(fs.readFileSync(adminFile)),runtime=dotenv.parse(fs.readFileSync(runtimeFile));
if(admin.NEON_BRANCH!=='production'||runtime.NEON_BRANCH!=='production')throw new Error('Explicit production environment required');
const owner=postgres(admin.DATABASE_URL_UNPOOLED,{max:1});
const sql=postgres(runtime.DATABASE_URL,{max:1,prepare:false});
try{
  const liveResult=spawnSync('neon',['config','status','--project-id','misty-field-54835523','--branch',admin.NEON_BRANCH_ID,'--config-json'],{encoding:'utf8'});
  if(liveResult.status!==0)throw new Error('Production service configuration unavailable');
  const live=JSON.parse(liveResult.stdout);
  if(!live.auth||['clinical-documents','einvoices'].some(bucket=>(live.buckets??live.preview?.buckets)?.[bucket]?.access!=='private'))throw new Error('Managed Auth/private bucket configuration mismatch');
  const [structure]=await owner`select count(*)::int as tables,count(*) filter(where c.relrowsecurity)::int as rls_tables from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`;
  if(structure.tables!==59||structure.rls_tables!==59)throw new Error('Public table/RLS contract mismatch');
  const roles=await owner`select rolname,rolsuper,rolbypassrls,rolinherit from pg_roles where rolname in ('monservice_runtime','monservice_stripe','monservice_reminders') order by rolname`;
  if(roles.length!==3||roles.some(role=>role.rolsuper||role.rolbypassrls||role.rolinherit))throw new Error('Unsafe runtime/worker role');
  const privilegedMembership=await owner`select rolname from pg_roles where rolname in ('monservice_runtime','monservice_stripe','monservice_reminders') and pg_has_role(oid,'neon_superuser','member')`;
  if(privilegedMembership.length)throw new Error('Runtime/worker inherits administrative capability');
  const [owned]=await owner`select count(*)::int as count from pg_tables where schemaname='public' and tableowner in ('monservice_runtime','monservice_stripe','monservice_reminders')`;
  if(owned.count)throw new Error('Runtime/worker owns business tables');
  const [constraints]=await owner`select count(*)::int as count,count(*) filter(where not convalidated)::int as unvalidated from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'`;
  if(constraints.unvalidated)throw new Error('Unvalidated production constraint');
  const [indexes]=await owner`select count(*)::int as count from pg_indexes where schemaname='public'`;
  const [triggers]=await owner`select count(*)::int as count from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal`;
  const [policies]=await owner`select count(*)::int as count from pg_policies where schemaname='public'`;
  const [auth]=await owner`select count(*)::int as users,count(*) filter(where "emailVerified")::int as verified from neon_auth."user"`;
  const [passwords]=await owner`select count(*)::int as count from neon_auth.account where password is not null`;
  const [mappings]=await owner`select count(*)::int as total,count(*) filter(where provider='supabase')::int as source,count(*) filter(where provider='neon')::int as neon from public.user_identities`;
  const [allowlist]=await owner`select count(*)::int as total,count(*) filter(where claimed_at is null)::int as pending from public.identity_reenrollments`;
  if(auth.users!==16||auth.verified!==0||passwords.count!==0||mappings.source!==5||mappings.neon!==0||allowlist.pending!==5)throw new Error('Initial imported identity state mismatch');
  const deniedTables=[];
  for(const table of ['users','organizations','clients','invoices','clinical_documents','patient_profiles','audit_logs','consent_events','data_subject_requests','processing_activities']){
    const [rows]=await sql.unsafe(`select count(*)::int as count from public."${table}"`);
    if(rows.count!==0)throw new Error('Unauthenticated runtime can see protected production rows');
    deniedTables.push(table);
  }
  const s3=new S3Client({endpoint:runtime.AWS_ENDPOINT_URL_S3,region:runtime.AWS_REGION,forcePathStyle:true,credentials:{accessKeyId:runtime.AWS_ACCESS_KEY_ID,secretAccessKey:runtime.AWS_SECRET_ACCESS_KEY}});
  const buckets=[];
  for(const Bucket of ['clinical-documents','einvoices']){
    const result=await s3.send(new ListObjectsV2Command({Bucket,MaxKeys:1}));
    if(result.KeyCount||result.IsTruncated)throw new Error('Unexpected production storage object');
    buckets.push({bucket:Bucket,objects:0,bytes:0});
  }
  s3.destroy();
  const checks=[];
  for(const args of [['scripts/neon/check-migrations.mjs'],['--import','tsx','scripts/check-schema-contract.ts'],['--import','tsx','scripts/check-custom-objects.ts']]){
    const result=spawnSync(process.execPath,args,{env:{...process.env,...admin,NEON_ADMIN_ENV_FILE:adminFile},encoding:'utf8'});
    if(result.status!==0)throw new Error('Read-only production contract check failed: '+args.at(-1));
    checks.push({check:args.at(-1),passed:true});
  }
  const report={verifiedAt:new Date().toISOString(),project:'misty-field-54835523',branch:admin.NEON_BRANCH_ID,region:'aws-eu-central-1',readOnly:true,structure,constraints,indexes:indexes.count,triggers:triggers.count,policies:policies.count,roles,ownedTables:owned.count,auth:{...auth,passwords:passwords.count,managed:true},mappings,reenrollments:allowlist,unauthenticatedRuntimeDeniedTables:deniedTables,storage:buckets.map(bucket=>({...bucket,access:'private'})),checks};
  fs.writeFileSync('docs/database/artifacts/production-validation-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(report);
}catch(error){console.error(error.code?{type:error.name,code:error.code}:error.message);process.exitCode=1;}finally{await Promise.all([owner.end(),sql.end()]);}
