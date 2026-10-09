// Source is an immutable private export. Never connects to Supabase for writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { spawnSync } from 'node:child_process';
const directory=process.env.MONSERVICE_SOURCE_EXPORT_DIR ?? path.join(os.homedir(),'.local/share/monservice-migration/2026-10-09');
const environment=dotenv.parse(fs.readFileSync(process.env.NEON_ADMIN_ENV_FILE ?? '.env.neon-production-admin.local'));
const inventory=JSON.parse(fs.readFileSync(path.join(directory,'source-inventory.json')));
const users=JSON.parse(fs.readFileSync(path.join(directory,'source-app-users.json')));
const identities=JSON.parse(fs.readFileSync(path.join(directory,'source-identities.json')));
const sourceTables=inventory.tables.filter(table=>table.schemaname==='public');
if (environment.NEON_BRANCH!=='production' || process.env.NEON_PRODUCTION_REPLAY!=='validated') throw new Error('Validated EU production target required');
if (!new URL(environment.DATABASE_URL_UNPOOLED).hostname.includes('eu-central-1')) throw new Error('EU target required');
if (sourceTables.length!==57 || sourceTables.some(table=>table.tablename!=='users' && Number(table.rows)!==0) || inventory.objects.length!==0) throw new Error('Source scope changed: reassess full data copy and HDS before import');
if (users.some(user=>user.password!==null) || users.length!==Number(sourceTables.find(table=>table.tablename==='users').rows)) throw new Error('Private export is inconsistent');
if (identities.some(user=>!user.email_confirmed_at || user.is_anonymous)) throw new Error('Unverified source identities require a separate import decision');
if(new Set(identities.map(user=>user.email.toLowerCase())).size!==identities.length)throw new Error('Duplicate source Auth email requires explicit reconciliation');
for(const user of users)if(!identities.some(identity=>identity.id===user.id && identity.email.toLowerCase()===user.email.toLowerCase()))throw new Error('Source business identity mismatch');
const verifiedSource=spawnSync(process.execPath,['scripts/neon/verify-source-unchanged.mjs'],{stdio:'pipe',env:process.env});
if(verifiedSource.status!==0)throw new Error('Source no longer matches the private export; refresh/reconcile before importing');
const sql=postgres(environment.DATABASE_URL_UNPOOLED,{max:1,prepare:false});
try {
  await sql.begin(async tx=>{
    for(const table of sourceTables){
      const [count]=await tx.unsafe(`select count(*)::int as count from public."${table.tablename.replaceAll('"','""')}"`);
      if(count.count!==0 && !(table.tablename==='users' && count.count===users.length))throw new Error('Target business data differs from source; reconcile explicitly before retry');
    }
    const [current]=await tx`select count(*)::int as count from public.users`;
    for(const user of current.count===0 ? users : []){
      await tx`insert into public.users ${tx(user)}`;
      const source=identities.find(identity=>identity.id===user.id);
      await tx`insert into public.user_identities(app_user_id,provider,provider_user_id,verified_at,linkage_method) values(${user.id},'supabase',${source.id},${source.email_confirmed_at},'source_import')`;
      await tx`insert into public.identity_reenrollments(app_user_id,verified_source_email,source_provider_user_id) values(${user.id},${source.email.toLowerCase()},${source.id})`;
    }
    const imported=await tx`select * from public.users order by id`;
    for(const source of users){const target=imported.find(row=>row.id===source.id);for(const [column,value]of Object.entries(source))if(target?.[column]!==value)throw new Error('Business field reconciliation failed: '+column);}
    const bindings=await tx`select app_user_id,provider_user_id,linkage_method from public.user_identities where provider='supabase'`;
    const reenrollments=await tx`select app_user_id,verified_source_email,source_provider_user_id from public.identity_reenrollments`;
    if(bindings.length!==users.length||reenrollments.length!==users.length)throw new Error('Source identity/reenrollment count mismatch');
    for(const user of users){
      if(!bindings.some(binding=>binding.app_user_id===user.id&&binding.provider_user_id===user.id&&binding.linkage_method==='source_import'))throw new Error('Source identity binding mismatch');
      if(!reenrollments.some(record=>record.app_user_id===user.id&&record.source_provider_user_id===user.id&&record.verified_source_email===user.email.toLowerCase()))throw new Error('Reenrollment allowlist mismatch');
    }
  });
  // Official management API creates users without credentials and without
  // marking email as verified. No password/session/token is imported or sent.
  let authCount=0;
  const existingAuth=await sql`select id,email from neon_auth."user"`;
  if(existingAuth.some(user=>!identities.some(source=>source.email.toLowerCase()===user.email.toLowerCase())))throw new Error('Unexpected Auth identity in import target');
  for(const identity of identities){
    if(existingAuth.some(user=>user.email.toLowerCase()===identity.email.toLowerCase())){authCount++;continue;}
    const result=spawnSync('neon',['api',`/projects/misty-field-54835523/branches/${environment.NEON_BRANCH_ID}/auth/users`,'-X','POST','-F',`email=${identity.email}`,'-F','name=Compte MonService'],{encoding:'utf8'});
    if(result.status!==0)throw new Error('Managed Auth creation failed; business import retained for explicit recovery');
    const created=JSON.parse(result.stdout);
    const [record]=await sql`select "emailVerified" from neon_auth."user" where id=${created.id}`;
    if(!record || record.emailVerified)throw new Error('Unexpected Auth verification state');
    authCount++;
  }
  const [actualAuth]=await sql`select count(*)::int as count from neon_auth."user"`;
  if(actualAuth.count!==identities.length)throw new Error('Auth count reconciliation failed');
  const counts=[];
  for(const table of sourceTables){const [target]=await sql.unsafe(`select count(*)::int as count from public."${table.tablename.replaceAll('"','""')}"`);if(target.count!==Number(table.rows))throw new Error('Table count mismatch: '+table.tablename);counts.push({table:table.tablename,source:Number(table.rows),target:target.count});}
  const files=['source-public.dump','source-inventory.json','source-identities.json','source-app-users.json'];
  const report={completedAt:new Date().toISOString(),source:'leydfjctaxohovcmcgea',target:'misty-field-54835523',branch:environment.NEON_BRANCH_ID,region:'aws-eu-central-1',counts,authUsers:authCount,sourceBindings:users.length,verifiedReenrollmentsPending:users.length,storage:{objects:0,bytes:0,copyRequired:false},sourceUnchangedVerifiedAt:JSON.parse(fs.readFileSync('docs/database/artifacts/source-unchanged-report.json')).verifiedAt,orphanOrganizationReferences:users.filter(user=>user.organization_id).length,monetaryAndSequences:'No billing, sequence, audit or clinical rows in source; all corresponding target counts remain zero',backup:files.map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,name))).digest('hex')}))};
  fs.writeFileSync(path.join(directory,'production-import-report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  fs.mkdirSync('docs/database/artifacts',{recursive:true});fs.writeFileSync('docs/database/artifacts/production-import-report.json',JSON.stringify(report,null,2)+'\n');
  console.log({businessTables:counts.length,businessProfiles:users.length,authUsers:authCount,storageObjects:0,fieldReconciliation:true});
} catch(error){console.error(error.code?{type:error.name,code:error.code}:error.message);process.exitCode=1;}finally{await sql.end();}
