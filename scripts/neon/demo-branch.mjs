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

// Netlify réserve les noms AWS_* (fonctions sur AWS Lambda) : le stockage passe par
// NEON_STORAGE_*, que l'application lit en priorité.
for (const [from, to] of [['AWS_ENDPOINT_URL_S3', 'NEON_STORAGE_ENDPOINT'], ['AWS_REGION', 'NEON_STORAGE_REGION'], ['AWS_ACCESS_KEY_ID', 'NEON_STORAGE_ACCESS_KEY_ID'], ['AWS_SECRET_ACCESS_KEY', 'NEON_STORAGE_SECRET_ACCESS_KEY']]) {
  if (out[from]) out[to] = out[from];
  delete out[from];
}
delete out.NEON_BRANCH_ID;
for (const file of [adminFile, runtimeFile]) fs.rmSync(file, { force: true });

// Les valeurs partent directement de GitHub vers Netlify (secret NETLIFY_AUTH_TOKEN) :
// aucune n'apparaît dans les journaux.
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!token) throw new Error('NETLIFY_AUTH_TOKEN secret is missing');
const netlify = async (method, path, body) => {
  const response = await fetch(`https://api.netlify.com/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Netlify API ${method} ${path.split('?')[0]} failed with status ${response.status}`);
  return response.status === 204 ? null : response.json();
};
const siteName = process.env.NETLIFY_SITE_NAME ?? 'monservicecrm';
const sites = await netlify('GET', `/sites?name=${encodeURIComponent(siteName)}&filter=all`);
const site = sites.find((candidate) => candidate.name === siteName);
if (!site) throw new Error(`Netlify site ${siteName} not found`);
const account = site.account_id ?? site.account_slug;
const existing = new Set((await netlify('GET', `/accounts/${account}/env?site_id=${site.id}`)).map((variable) => variable.key));
const scopes = ['builds', 'functions', 'runtime'];
for (const [key, value] of Object.entries(out)) {
  const variable = { key, scopes, values: [{ context: 'all', value }] };
  if (existing.has(key)) await netlify('PUT', `/accounts/${account}/env/${key}?site_id=${site.id}`, variable);
  else await netlify('POST', `/accounts/${account}/env?site_id=${site.id}`, [variable]);
}
console.log(`Netlify environment updated (${Object.keys(out).length} variables)`);
fs.appendFileSync(process.env.GITHUB_ENV ?? '/dev/null', `NETLIFY_SITE_ID=${site.id}\n`);
