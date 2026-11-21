// Environnement de démonstration persistant (branche Neon « demo »), séparé de la
// production. Crée la branche au premier passage, applique les migrations à chaque
// passage, régénère les identifiants d'exécution et produit un fichier d'environnement
// chiffré avec la clé publique DEMO_ENV_PUBLIC_KEY (jamais de secret en clair dans
// les journaux ni dans l'artefact).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const project = 'misty-field-54835523';
const template = 'br-icy-morning-b1317ev6';
const production = 'br-little-surf-b1l5wgni';
const name = 'demo';
const appUrl = process.env.DEMO_APP_URL;
if (!appUrl) throw new Error('DEMO_APP_URL is required');
const adminFile = '.env.demo-admin.local';
const runtimeFile = '.env.demo-runtime.local';
const environment = { ...process.env, NEON_ADMIN_ENV_FILE: adminFile, NEON_RUNTIME_ENV_FILE: runtimeFile };

function command(binary, args, visible = false) {
  const result = spawnSync(binary, args, { env: environment, encoding: 'utf8', stdio: visible ? 'inherit' : 'pipe' });
  if (result.status !== 0) throw new Error(`Command failed: ${binary} ${args[0]} (status ${result.status})`);
  return result.stdout;
}
const cli = (args) => command('neon', args);

const branches = JSON.parse(cli(['branches', 'list', '--project-id', project, '-o', 'json']));
const list = Array.isArray(branches) ? branches : branches.branches;
let branch = list.find((candidate) => candidate.name === name);
if (!branch) {
  const created = JSON.parse(cli(['branches', 'create', '--project-id', project, '--name', name, '--parent', template, '--cu', '0.25', '--no-secrets', '-o', 'json']));
  branch = created.branch;
  if (branch.parent_id !== template) throw new Error('Demo parent mismatch');
  console.log('Created demo branch');
} else {
  console.log('Reusing demo branch');
}
if (branch.id === production) throw new Error('Refusing to touch production');

cli(['config', 'apply', '--project-id', project, '--branch', branch.id, '--no-env-pull']);
const endpoint = `/projects/${project}/branches/${branch.id}/auth`;
// Démonstration : pas de code par e-mail à l'inscription (aucun envoi d'e-mail configuré).
cli(['api', `${endpoint}/email_and_password`, '-X', 'PATCH', '-F', 'enabled=true', '-F', 'email_verification_method=otp', '-F', 'require_email_verification=false', '-F', 'send_verification_email_on_sign_up=false', '-F', 'send_verification_email_on_sign_in=false']);
cli(['env', 'pull', '--project-id', project, '--branch', branch.id, '--file', adminFile, '--service', 'postgres,auth,object-storage']);
fs.chmodSync(adminFile, 0o600);

const admin = dotenv.parse(fs.readFileSync(adminFile));
const save = (path, env) => fs.writeFileSync(path, Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
save(adminFile, admin);
save(runtimeFile, admin);
command('node', ['scripts/neon/migrate.mjs'], true);
command('node', ['scripts/neon/runtime-credentials.mjs'], true);

const runtime = dotenv.parse(fs.readFileSync(runtimeFile));
const keep = (key) => /^(DATABASE_URL|NEON_STRIPE_DATABASE_URL|NEON_REMINDERS_DATABASE_URL|NEON_AUTH_BASE_URL|NEON_AUTH_JWKS_URL|AWS_ENDPOINT_URL_S3|AWS_REGION|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_S3_BUCKET|NEON_STORAGE_BUCKET.*)$/.test(key);
const out = Object.fromEntries(Object.entries(runtime).filter(([key]) => keep(key)));
Object.assign(out, {
  NEON_AUTH_COOKIE_SECRET: crypto.randomBytes(48).toString('hex'),
  CRON_SECRET: crypto.randomBytes(32).toString('hex'),
  NEXT_PUBLIC_APP_URL: appUrl,
  LAUNCH_INCLUDED_PLAN: 'pro',
  CLIENT_ACCESS_ENABLED: 'false',
  DATABASE_POOL_MAX: '5',
  NEON_BRANCH_ID: branch.id,
});
console.log('Runtime keys:', Object.keys(out).sort().join(', '));
console.log('Runtime role:', new URL(out.DATABASE_URL).username);

// Les variables partent directement de GitHub vers Vercel (jeton VERCEL_TOKEN dans
// les secrets du dépôt) : aucune valeur n'apparaît dans les journaux ni ailleurs.
const vercelToken = process.env.VERCEL_TOKEN;
const team = 'team_rWwEXqoM91yFl0AQdwuxyjlI';
const vercelProject = 'prj_gBJtdHZLC3D6uJje6vEtSgVMPnJS';
if (!vercelToken) throw new Error('VERCEL_TOKEN secret is missing');
for (const file of [adminFile, runtimeFile]) fs.rmSync(file, { force: true });
const visible = new Set(['NEXT_PUBLIC_APP_URL', 'LAUNCH_INCLUDED_PLAN', 'CLIENT_ACCESS_ENABLED', 'DATABASE_POOL_MAX', 'AWS_REGION', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_JWKS_URL', 'AWS_ENDPOINT_URL_S3', 'NEON_BRANCH_ID']);
const vercel = async (path, body) => {
  const response = await fetch(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${team}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Vercel API ${path.split('?')[0]} failed with status ${response.status}`);
  return response.json();
};
await vercel(`/v10/projects/${vercelProject}/env?upsert=true`, Object.entries(out).map(([key, value]) => ({
  key, value, type: visible.has(key) ? 'plain' : 'sensitive', target: ['production'],
})));
console.log('Vercel environment updated');
const deployment = await vercel('/v13/deployments', {
  name: 'monservice-demo',
  project: vercelProject,
  target: 'production',
  gitSource: { type: 'github', org: 'Soufianeerd', repo: 'monservice', ref: process.env.GITHUB_REF_NAME ?? 'launch/v1-professional-only' },
});
console.log('Vercel production deployment started:', deployment.id);
