// Read-only public cutover checks. Never edits Auth, sends email or deploys.
import fs from 'node:fs';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';

const project = 'misty-field-54835523';
const branch = 'br-little-surf-b1l5wgni';
const runtime = dotenv.parse(fs.readFileSync('.env.neon-production.local'));
const admin = dotenv.parse(fs.readFileSync('.env.neon-production-admin.local'));
if (runtime.NEON_BRANCH !== 'production' || runtime.NEON_BRANCH_ID !== branch) {
  throw new Error('Canonical EU production environment required');
}
function cli(args) {
  const result = spawnSync('neon', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Read-only Neon configuration check failed');
  return JSON.parse(result.stdout);
}
const read = path => cli(['api', `/projects/${project}/branches/${branch}/auth${path}`, '-X', 'GET']);
const auth = read('');
const policy = read('/email_and_password');
const domains = read('/domains').domains.filter(entry => entry.auth_provider === 'better_auth').map(entry => entry.domain);
const localhost = read('/allow_localhost').allow_localhost;
const smtp = read('/email_provider');
const services = cli(['config', 'status', '--project-id', project, '--branch', branch, '--config-json']);
const checks = [];
const check = (name, passed) => checks.push({ name, passed: !!passed });
function url(value) { try { return new URL(value); } catch { return null; } }
const application = url(runtime.NEXT_PUBLIC_APP_URL);
const database = url(runtime.DATABASE_URL);
const target = url(admin.DATABASE_URL_UNPOOLED);
const sameTarget = value => {
  const candidate = url(value);
  return candidate && target && candidate.hostname.replace('-pooler.', '.') === target.hostname.replace('-pooler.', '.') && candidate.pathname === target.pathname && candidate.searchParams.get('sslmode') === 'require';
};
const publicOrigin = application?.protocol === 'https:' && application.pathname === '/' && !application.search && !application.hash && !application.username && !application.password && !['localhost', '127.0.0.1', '[::1]'].includes(application.hostname)
  ? application.origin : null;
check('canonical_https_application_url', publicOrigin && runtime.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') === publicOrigin);
check('runtime_role_and_pooled_connection', database?.username === 'monservice_runtime' && database.hostname.endsWith('.neon.tech') && database.hostname.includes('-pooler.') && sameTarget(runtime.DATABASE_URL));
check('production_auth_endpoint', runtime.NEON_AUTH_BASE_URL === auth.base_url && auth.branch_id === branch);
check('private_cookie_secret', runtime.NEON_AUTH_COOKIE_SECRET?.length >= 32);
check('mandatory_email_verification', policy.enabled && policy.require_email_verification && policy.email_verification_method === 'otp');
check('production_localhost_disabled', localhost === false);
check('canonical_origin_authorized', publicOrigin && Array.isArray(domains) && domains.includes(publicOrigin));
check('private_storage_buckets', ['clinical-documents', 'einvoices'].every(bucket => (services.buckets ?? services.preview?.buckets)?.[bucket]?.access === 'private'));
check('private_storage_credentials', runtime.AWS_ENDPOINT_URL_S3 === admin.AWS_ENDPOINT_URL_S3 && runtime.AWS_REGION === 'eu-central-1' && runtime.AWS_ACCESS_KEY_ID && runtime.AWS_SECRET_ACCESS_KEY);
// The current Management API names custom SMTP "standard".
check('custom_auth_email_provider', smtp.type === 'standard' && smtp.host && smtp.port && smtp.sender_email && !smtp.sender_email.endsWith('@mail.myneon.app'));
check('business_email_sender', runtime.EMAIL_FROM && runtime.RESEND_API_KEY);
const forbidden = ['DATABASE_URL_UNPOOLED', 'NEON_ADMIN_DATABASE_URL', 'NEON_API_KEY', 'NEON_CI_API_KEY', 'E2E_AUTH_PASSWORD'];
check('no_admin_or_source_credentials_in_runtime', !Object.keys(runtime).some(key => forbidden.includes(key) || /SUPABASE/i.test(key)));
const workerRole = (key, role) => url(runtime[key])?.username === role && sameTarget(runtime[key]);
check('stripe_worker_role', workerRole('NEON_STRIPE_DATABASE_URL', 'monservice_stripe'));
check('reminders_worker_role', workerRole('NEON_REMINDERS_DATABASE_URL', 'monservice_reminders'));
const optionalIntegrations = {
  stripe: runtime.STRIPE_SECRET_KEY || runtime.STRIPE_WEBHOOK_SECRET ? 'configured-needs-host-reconciliation' : 'host-settings-not-yet-reconciled',
  reminders: runtime.CRON_SECRET ? 'configured-needs-scheduler-reconciliation' : 'host-settings-not-yet-reconciled',
};
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
if (head.status !== 0) throw new Error('Git revision unavailable');
const report = {
  checkedAt: new Date().toISOString(), gitHead: head.stdout.trim(), project, branch,
  readOnly: true, publicDeploymentPerformed: false,
  technicalChecksPassed: checks.every(check => check.passed),
  checks, blockers: checks.filter(check => !check.passed).map(check => check.name),
  observations: { publicOrigin, trustedOriginCount: domains.length, localhostAllowed: localhost, authEmailProvider: smtp.type },
  optionalIntegrations,
  remainingCutoverSteps: [
    'Install and verify production-only Netlify runtime variables; previews use synthetic credentials',
    'Consent-based mailbox receipt of OTP and password-reset link',
    'Source delta reconciliation and write-freeze cutover window',
    'Final approval before Git push, merge or public deployment',
  ],
  clinicalRealData: 'NO-GO until hosting HDS coverage demonstrated',
};
fs.writeFileSync('docs/database/artifacts/cutover-preflight-report.json', JSON.stringify(report, null, 2) + '\n');
console.log({ technicalChecksPassed: report.technicalChecksPassed, blockers: report.blockers, publicDeploymentPerformed: false });
// A failed gate is a normal, explicit NO-GO, not an invitation to bypass it.
if (!report.technicalChecksPassed) process.exitCode = 2;
