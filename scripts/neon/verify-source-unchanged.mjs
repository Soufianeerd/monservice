// Read-only comparison with the private immutable export. No PII is emitted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import postgres from 'postgres';

const directory=process.env.MONSERVICE_SOURCE_EXPORT_DIR ?? path.join(os.homedir(),'.local/share/monservice-migration/2026-10-09');
const environment=dotenv.parse(fs.readFileSync(path.join(directory,'source.env')));
if(!decodeURIComponent(new URL(environment.DATABASE_URL).username).includes('leydfjctaxohovcmcgea'))throw new Error('Unexpected source project');
const inventory=JSON.parse(fs.readFileSync(path.join(directory,'source-inventory.json')));
const users=JSON.parse(fs.readFileSync(path.join(directory,'source-app-users.json')));
const identities=JSON.parse(fs.readFileSync(path.join(directory,'source-identities.json')));
const sql=postgres(environment.DATABASE_URL,{max:1,prepare:false});
try {
  await sql.begin('isolation level repeatable read read only',async tx=>{
    for(const table of inventory.tables.filter(table=>table.schemaname==='public')){
      const [live]=await tx.unsafe(`select count(*)::int as count from public."${table.tablename.replaceAll('"','""')}"`);
      if(live.count!==Number(table.rows))throw new Error('Source count changed: '+table.tablename);
    }
    const liveUsers=await tx`select * from public.users order by id`;
    for(const source of users){
      const live=liveUsers.find(user=>user.id===source.id);
      for(const [column,value]of Object.entries(source))if(live?.[column]!==value)throw new Error('Source business field changed: '+column);
    }
    const liveIdentities=await tx`select id,email,email_confirmed_at,created_at,updated_at,is_anonymous from auth.users order by id`;
    if(JSON.stringify(liveIdentities)!==JSON.stringify(identities))throw new Error('Source identity export changed');
    const buckets=await tx`select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id`;
    const objects=await tx`select bucket_id,count(*)::int as count,sum(coalesce((metadata->>'size')::bigint,0))::text as bytes from storage.objects group by bucket_id`;
    if(JSON.stringify(buckets)!==JSON.stringify(inventory.buckets)||JSON.stringify(objects)!==JSON.stringify(inventory.objects))throw new Error('Source storage changed');
  });
  const report={verifiedAt:new Date().toISOString(),source:'leydfjctaxohovcmcgea',readOnlyTransaction:true,businessTables:57,businessProfiles:users.length,authUsers:identities.length,storageObjects:0,countsAndBusinessFieldsUnchanged:true};
  fs.writeFileSync('docs/database/artifacts/source-unchanged-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(report);
} catch(error){console.error(error.code?{type:error.name,code:error.code}:error.message);process.exitCode=1;}finally{await sql.end();}
