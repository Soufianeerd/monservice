// Replays the exact isolated CI lifecycle locally or on GitHub Actions.
// The parent is the immutable empty template created before production imports.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import postgres from 'postgres';

const project = 'misty-field-54835523';
const template = 'br-icy-morning-b1317ev6';
const name = `ci-${process.env.GITHUB_RUN_ID ?? Date.now()}-${process.env.GITHUB_RUN_ATTEMPT ?? 'local'}`;
const adminFile = `.env.${name}-admin.local`;
const runtimeFile = `.env.${name}-runtime.local`;
const environment = { ...process.env, NEON_ADMIN_ENV_FILE: adminFile, NEON_RUNTIME_ENV_FILE: runtimeFile };
let branchId;
let validationSucceeded=false;
const authOnly = process.env.NEON_CI_AUTH_ONLY === 'true';
// Rejeu ciblé après une correction de tests navigateur : rapport distinct,
// sans présenter comme rejouées les matrices DB du mode complet par défaut.
const browserOnly = process.env.NEON_CI_BROWSER_ONLY === 'true';
if (authOnly && browserOnly) throw new Error('Choose exactly one targeted validation scope');
const validatedCommands=[];
function command(binary, args, env = environment, visible = false) {
  const result = spawnSync(binary, args, { env, encoding: 'utf8', stdio: visible ? 'inherit' : 'pipe' });
  if (result.status !== 0) throw new Error(`CI command failed: ${binary} ${args[0]} (status ${result.status})`);
  if(visible)validatedCommands.push({command:[binary,...args].join(' '),passed:true});
  return result.stdout;
}
const cli = args => command('neon', args);
const validationHead = command('git', ['rev-parse', 'HEAD']).trim();
const validationWorktreeClean = command('git', ['status', '--porcelain']).trim() === '';
try {
  const created = JSON.parse(cli(['branches','create','--project-id',project,'--name',name,'--parent',template,'--cu','0.25','--no-secrets','--expires-at',new Date(Date.now()+86400000).toISOString(),'-o','json']));
  branchId = created.branch.id;
  if (created.branch.parent_id !== template) throw new Error('CI parent mismatch');
  console.log(`Created synthetic CI branch ${name}`);
  cli(['config','plan','--project-id',project,'--branch',branchId]);
  cli(['config','apply','--project-id',project,'--branch',branchId,'--no-env-pull']);
  const endpoint = `/projects/${project}/branches/${branchId}/auth`;
  cli(['api',`${endpoint}/allow_localhost`,'-X','PATCH','-F','allow_localhost=true']);
  cli(['api',`${endpoint}/email_and_password`,'-X','PATCH','-F','enabled=true','-F','email_verification_method=otp','-F','require_email_verification=false','-F','send_verification_email_on_sign_up=false','-F','send_verification_email_on_sign_in=false']);
  cli(['env','pull','--project-id',project,'--branch',branchId,'--file',adminFile,'--service','postgres,auth,object-storage']);
  fs.chmodSync(adminFile,0o600);
  const admin = dotenv.parse(fs.readFileSync(adminFile));
  const sql = postgres(admin.DATABASE_URL_UNPOOLED,{max:1});
  try {
    const [existing] = await sql`select count(*)::int as count from pg_tables where schemaname='public'`;
    if (existing.count !== 0) throw new Error('CI template is not empty');
  } finally { await sql.end(); }
  Object.assign(admin,{ NEON_BRANCH:name, NEON_AUTH_COOKIE_SECRET:crypto.randomBytes(48).toString('hex'), E2E_AUTH_PASSWORD:crypto.randomBytes(32).toString('hex')+'Aa1!', NEXT_PUBLIC_APP_URL:'http://localhost:3039' });
  const save = (path, env) => fs.writeFileSync(path,Object.entries(env).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n',{mode:0o600});
  save(adminFile,admin);
  save(runtimeFile,admin);
  command('node',['scripts/neon/migrate.mjs'],environment,true);
  command('node',['scripts/neon/runtime-credentials.mjs'],environment,true);
  const run = (args, extraEnvironment = {}) => command('node',['scripts/neon/run-tests.mjs',...args],{...environment,...extraEnvironment},true);
  if (!authOnly) run(['npx','tsx','scripts/e2e/seed-local.ts']);
  if (process.env.NEON_CI_SETUP_ONLY !== 'true') {
    if (!authOnly) {
    run(['npm','run','db:check-drift']);
    run(['npm','run','db:check-contract']);
    run(['npm','run','db:check-custom-objects']);
    run(['npm','run','typecheck']);
    run(['npm','run','lint']);
    run(['npx','vitest','run','__tests__/unit','tests/unit','__tests__/compliance']);
    if (!browserOnly) {
    run(['npm','run','test:db-constraints','--','--no-file-parallelism','--hookTimeout=180000']);
    run(['npm','run','test:rls','--','--no-file-parallelism','--hookTimeout=180000']);
    run(['npm','run','test:neon-boundaries']);
    // Restore only classifications changed by DB scenarios, without replaying data or Auth.
    run(['npx','tsx','scripts/e2e/seed-local.ts'],{NEON_SEED_WORKSPACE_ONLY:'true'});
    }
    }
    run(['npm','run','build']);
    // Match production's mandatory verification policy without affecting the
    // historical unverified synthetic login fixtures or the production branch.
    cli(['api',`${endpoint}/email_and_password`,'-X','PATCH','-F','require_email_verification=true']);
    command('node',['scripts/neon/run-tests.mjs','npx','playwright','test','e2e/auth-recovery.spec.ts','--workers=1'],{...environment,E2E_PRODUCTION_BUILD:'true',E2E_STRICT_AUTH:'true'},true);
    if (!authOnly) {
      cli(['api',`${endpoint}/email_and_password`,'-X','PATCH','-F','require_email_verification=false']);
      command('node',['scripts/neon/run-tests.mjs','npx','playwright','test','--workers=1'],{...environment,E2E_PRODUCTION_BUILD:'true'},true);
    }
  }
  console.log(`Synthetic CI replay succeeded (${process.env.NEON_CI_SETUP_ONLY === 'true' ? 'setup only' : authOnly ? 'strict Auth browser validation' : browserOnly ? 'browser regression' : 'full validation'})`);
  validationSucceeded=process.env.NEON_CI_SETUP_ONLY!=='true';
} catch (error) {
  console.error(error.message);
  process.exitCode=1;
} finally {
  if (branchId) {
    try { cli(['branches','delete',branchId,'--project-id',project]); console.log('Deleted disposable CI branch'); }
    catch { console.error('CI branch cleanup failed; expiration remains the fallback'); process.exitCode=1; }
  }
  for (const path of [adminFile,runtimeFile]) if (fs.existsSync(path)) fs.unlinkSync(path);
  if(validationSucceeded&&process.exitCode!==1){
    const report={completedAt:new Date().toISOString(),project,region:'aws-eu-central-1',template,validatedBranch:branchId,branchDeleted:true,syntheticOnly:true,workers:1,gitHead:validationHead,worktreeCleanAtStart:validationWorktreeClean,commands:validatedCommands,migrations:fs.readdirSync('drizzle/neon').filter(name=>name.endsWith('.sql')).sort().map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync('drizzle/neon/'+name)).digest('hex')}))};
    fs.mkdirSync('docs/database/artifacts',{recursive:true});
    report.validationScope=authOnly?'mandatory-email-verification-browser':browserOnly?'browser-regression':'full';
    fs.writeFileSync(`docs/database/artifacts/${authOnly?'auth-recovery':browserOnly?'browser':'ci'}-validation-report.json`,JSON.stringify(report,null,2)+'\n');
    console.log('Saved sanitized CI validation evidence');
  }
}
