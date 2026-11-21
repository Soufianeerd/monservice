// Explicit backend replay, authorized separately from any public app deployment.
// Keeps the local application on the synthetic validation branch.
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';

process.umask(0o077);
const project='misty-field-54835523',branch='br-little-surf-b1l5wgni';
const adminFile='.env.neon-production-admin.local',runtimeFile='.env.neon-production.local';
if(process.env.NEON_PRODUCTION_REPLAY!=='validated')throw new Error('Explicit validated production replay required');
const evidence=JSON.parse(fs.readFileSync('docs/database/artifacts/ci-validation-report.json'));
if(evidence.project!==project||!evidence.syntheticOnly||!evidence.branchDeleted||!evidence.commands.some(step=>step.command.includes('playwright test --workers=1')&&step.passed))throw new Error('Completed isolated CI evidence required');
const files=fs.readdirSync('drizzle/neon').filter(name=>name.endsWith('.sql')).sort();
if(files.length!==evidence.migrations.length||files.some(name=>evidence.migrations.find(migration=>migration.name===name)?.sha256!==crypto.createHash('sha256').update(fs.readFileSync('drizzle/neon/'+name)).digest('hex')))throw new Error('Migrations differ from completed validation');
const environment={...process.env,NEON_ADMIN_ENV_FILE:adminFile,NEON_RUNTIME_ENV_FILE:runtimeFile};
const command=(binary,args,visible=false)=>{
  const result=spawnSync(binary,args,{env:environment,encoding:'utf8',stdio:visible?'inherit':'pipe'});
  if(result.status!==0)throw new Error(`Production preparation failed: ${binary} ${args[0]}`);
  return result.stdout;
};
const cli=args=>command('neon',args);
const previous=fs.existsSync(adminFile)?dotenv.parse(fs.readFileSync(adminFile)):{};
try{
  const metadata=JSON.parse(cli(['api',`/projects/${project}`])).project;
  if(metadata.region_id!=='aws-eu-central-1')throw new Error('Production target is not Frankfurt');
  const selected=JSON.parse(cli(['branches','get',branch,'--project-id',project,'-o','json']));
  if(selected.name!=='production'||selected.project_id!==project||!selected.default)throw new Error('Unexpected production branch');
  cli(['config','plan','--project-id',project,'--branch',branch]);
  cli(['config','apply','--project-id',project,'--branch',branch,'--no-env-pull']);
  const endpoint=`/projects/${project}/branches/${branch}/auth`;
  cli(['api',`${endpoint}/allow_localhost`,'-X','PATCH','-F','allow_localhost=false']);
  cli(['api',`${endpoint}/email_and_password`,'-X','PATCH','-F','enabled=true','-F','email_verification_method=otp','-F','require_email_verification=true','-F','send_verification_email_on_sign_up=true','-F','send_verification_email_on_sign_in=true']);
  cli(['env','pull','--project-id',project,'--branch',branch,'--file',adminFile,'--service','postgres,auth,object-storage']);
  fs.chmodSync(adminFile,0o600);
  const admin=dotenv.parse(fs.readFileSync(adminFile));
  if(!new URL(admin.DATABASE_URL_UNPOOLED).hostname.includes('eu-central-1'))throw new Error('Unexpected production connection region');
  Object.assign(admin,{NEON_BRANCH:'production',NEON_BRANCH_ID:branch,NEON_AUTH_COOKIE_SECRET:previous.NEON_AUTH_COOKIE_SECRET||crypto.randomBytes(48).toString('hex')});
  const save=(file,values)=>fs.writeFileSync(file,Object.entries(values).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n',{mode:0o600});
  save(adminFile,admin);
  const existingRuntime=fs.existsSync(runtimeFile)?dotenv.parse(fs.readFileSync(runtimeFile)):{};
  const runtime={...admin,...existingRuntime,NEON_BRANCH:'production',NEON_BRANCH_ID:branch};
  delete runtime.DATABASE_URL_UNPOOLED;
  save(runtimeFile,runtime);
  command(process.execPath,['scripts/neon/migrate.mjs'],true);
  command(process.execPath,['scripts/neon/runtime-credentials.mjs'],true);
  console.log({project,branch,region:'aws-eu-central-1',managedAuth:true,privateBuckets:['clinical-documents','einvoices'],migrations:files.length,localAppBranch:'migration-validation',publicDeployment:false});
}catch(error){console.error(error.message);process.exitCode=1;}
