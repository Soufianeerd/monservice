import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import postgres from 'postgres';

const directory = path.join(os.homedir(),'.local/share/monservice-migration/2026-10-09');
const source = JSON.parse(fs.readFileSync(path.join(directory,'source-inventory.json')));
const canonical = postgres(process.env.CANONICAL_SCHEMA_DATABASE_URL ?? `postgres://${os.userInfo().username}@127.0.0.1:55439/postgres`,{max:1});
const normalize = value => value.replaceAll('public.','').replaceAll('"','').replace(/\s+/g,' ').trim();
const differences = (deployed, desired, key, definition) => {
  const result=[];
  for (const target of desired) {
    const existing=deployed.find(row=>key(row)===key(target));
    if (!existing) result.push({ object:key(target), classification:'REPO_ONLY', canonical:definition(target) });
    else if (normalize(definition(existing))!==normalize(definition(target))) result.push({object:key(target),classification:'SOURCE_DEPLOYED_BUT_DRIFTED',source:definition(existing),canonical:definition(target)});
  }
  for (const existing of deployed) if (!desired.some(row=>key(row)===key(existing))) result.push({object:key(existing),classification:'SOURCE_ONLY',source:definition(existing)});
  return result;
};
try {
  const columns=await canonical`select table_name,column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`;
  const constraints=await canonical`select c.conname,c.contype,c.conrelid::regclass::text as relation,pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' order by c.conname`;
  const indexes=await canonical`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`;
  const functions=await canonical`select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')`;
  const triggers=await canonical`select c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal`;
  const policies=await canonical`select * from pg_policies where schemaname='public'`;
  const migrations=fs.readdirSync('drizzle/postgres').filter(name=>name.endsWith('.sql')).map(name=>({name,hash:crypto.createHash('sha256').update(fs.readFileSync('drizzle/postgres/'+name)).digest('hex')}));
  const businessNames=new Set(functions.map(row=>row.proname));
  const report={
    comparedAt:new Date().toISOString(),sourceProject:'leydfjctaxohovcmcgea',canonical:'closed migrations 0000–0023',
    columns:differences(source.columns,columns,row=>row.table_name+'.'+row.column_name,row=>JSON.stringify([row.data_type,row.udt_name,row.is_nullable,row.column_default])),
    constraints:differences(source.constraints,constraints,row=>row.relation+'.'+row.conname,row=>row.definition),
    indexes:differences(source.indexes,indexes,row=>row.tablename+'.'+row.indexname,row=>row.indexdef),
    functions:differences(source.functions.filter(row=>businessNames.has(row.proname)),functions,row=>row.proname+'('+row.arguments+')',row=>row.definition),
    triggers:differences(source.triggers,triggers,row=>row.relname+'.'+row.tgname,row=>row.definition),
    policies:differences(source.policies.filter(row=>row.schemaname==='public'),policies,row=>row.tablename+'.'+row.policyname,row=>JSON.stringify([row.cmd,row.permissive,row.roles,row.qual,row.with_check])),
    ledger:{exactMatches:migrations.filter(row=>source.migrations.some(m=>m.hash===row.hash)).length,repoOnly:migrations.filter(row=>!source.migrations.some(m=>m.hash===row.hash)),sourceUnmatched:source.migrations.filter(row=>!migrations.some(m=>m.hash===row.hash))},
    decisions:{structure:'Canonical replay replaces source drift; no business rows depend on altered constraints because all tables except users are empty.',authTrigger:'Supabase auth.users trigger is replaced by explicit Neon provisioning.',identity:'Provider binding changes are explicit in versioned Neon SQL.',closedAccount:'Gate 1 migration 0023 is repo-only and mandatory on Neon.',orphanOrganizations:'Five source profiles reference absent organizations; retain references in import, recover only through verified self-service provisioning.'},
  };
  fs.mkdirSync('docs/database/artifacts',{recursive:true});
  fs.writeFileSync('docs/database/artifacts/source-schema-reconciliation.json',JSON.stringify(report,null,2)+'\n');
  console.log(Object.fromEntries(['columns','constraints','indexes','functions','triggers','policies'].map(key=>[key,report[key].length])));
} finally { await canonical.end(); }
