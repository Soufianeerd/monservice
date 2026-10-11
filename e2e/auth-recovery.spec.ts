import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// These owner-only fixture readers never run against production. They test
// the actual browser, SDK, provider and RLS; they do not prove mail delivery.
const admin = postgres(process.env.NEON_ADMIN_DATABASE_URL!, { max: 1 });
const password = process.env.E2E_AUTH_PASSWORD!;
let branchId: string;
const cli = (args: string[]) => {
  const result = spawnSync('neon', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Synthetic Auth management operation failed');
  return JSON.parse(result.stdout);
};

async function login(page: Page, email: string, callbackUrl?: string) {
  await page.goto(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
}

async function verify(page: Page, email: string) {
  await page.goto(`/verify-email?email=${encodeURIComponent(email)}`);
  await page.getByRole('button', { name: 'Envoyer un code' }).click();
  await expect(page.getByRole('status')).toContainText('un code a été envoyé');
  const [verification] = await admin`select value from neon_auth.verification
    where identifier like ${'%' + email + '%'} order by "createdAt" desc limit 1`;
  const hash = verification?.value.split(':')[0];
  let otp = '';
  for (let value = 0; value < 1_000_000; value++) {
    const candidate = String(value).padStart(6, '0');
    if (createHash('sha256').update(candidate).digest('base64url') === hash) { otp = candidate; break; }
  }
  if (!otp) throw new Error('Managed synthetic OTP format changed');
  await page.getByLabel('Code reçu').fill('000000' === otp ? '999999' : '000000');
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Code invalide ou expiré.');
  await page.getByLabel('Code reçu').fill(otp);
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await page.waitForURL('**/login');
  const [provider] = await admin`select "emailVerified" from neon_auth."user" where email=${email}`;
  expect(provider.emailVerified).toBe(true);
}

test.describe('Production Auth policy — actual browser recovery', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(async () => {
    if (process.env.E2E_STRICT_AUTH !== 'true' || !process.env.NEON_BRANCH?.startsWith('ci-')) {
      throw new Error('Disposable synthetic strict Auth branch required');
    }
    branchId = cli(['branches', 'get', process.env.NEON_BRANCH, '--project-id', 'misty-field-54835523', '-o', 'json']).id;
    if (branchId === 'br-little-surf-b1l5wgni') throw new Error('Production forbidden');
    const config = cli(['api', `/projects/misty-field-54835523/branches/${branchId}/auth/email_and_password`, '-X', 'GET']);
    expect(config.require_email_verification).toBe(true);
  });
  test.afterAll(async () => { await admin.end(); });

  test('new client must verify before login and keeps its signup identity', async ({ page }) => {
    const email = `browser-signup-${randomUUID()}@monservice.invalid`;
    await page.goto('/register');
    await page.locator('input[name="name"]').fill('Synthetic new client');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('button', { name: /Je suis un particulier/ }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Valider mon inscription' }).click();
    await page.waitForURL('**/verify-email?email=*');
    const [profile] = await admin`select id,profile_type,organization_id from public.users where email=${email}`;
    expect(profile).toMatchObject({ profile_type: 'client', organization_id: null });
    await login(page, email);
    await expect(page.getByText('Email ou mot de passe incorrect', { exact: true })).toBeVisible();
    await verify(page, email);
    await login(page, email, 'https://example.invalid');
    await page.waitForURL('**/client/dashboard');
    await page.reload();
    await expect(page).toHaveURL(/\/client\/dashboard$/);
    const profiles = await admin`select id,profile_type from public.users where email=${email}`;
    expect(profiles).toEqual([{ id: profile.id, profile_type: 'client' }]);
    const signedOut = await page.request.post('/api/auth/sign-out', { data: {}, headers: { origin: 'http://localhost:3039' } });
    expect(signedOut.ok()).toBe(true);
    await page.goto('/client/dashboard');
    await page.waitForURL(/\/login(?:\?|$)/);
  });

  test('imported professional resets and verifies, claims stable identity and recovers only its own workspace', async ({ page }) => {
    const email = `browser-recovery-${randomUUID()}@monservice.invalid`;
    const appId = randomUUID();
    const missingOrg = randomUUID();
    const providerId = cli(['api', `/projects/misty-field-54835523/branches/${branchId}/auth/users`, '-X', 'POST', '-F', `email=${email}`, '-F', 'name=Synthetic imported professional']).id;
    const now = new Date().toISOString();
    await admin`insert into public.users(id,email,name,profile_type,organization_id,created_at,updated_at)
      values(${appId},${email},'Synthetic imported professional','professional',${missingOrg},${now},${now})`;
    await admin`insert into public.identity_reenrollments(app_user_id,verified_source_email,source_provider_user_id)
      values(${appId},${email},${randomUUID()})`;
    expect(await admin`select id from neon_auth.account where "userId"=${providerId} and password is not null`).toHaveLength(0);
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill(email);
    await page.getByRole('button', { name: 'Envoyer le lien' }).click();
    await expect(page.getByText('Si ce compte existe, un email de réinitialisation a été envoyé.')).toBeVisible();
    const [reset] = await admin`select identifier from neon_auth.verification where value=${providerId}
      and identifier like 'reset-password:%' order by "createdAt" desc limit 1`;
    if (!reset) throw new Error('Managed synthetic reset token missing');
    const resetPath = `/reset-password?token=${encodeURIComponent(reset.identifier.slice('reset-password:'.length))}`;
    await page.goto(resetPath);
    await page.locator('input[type="password"]').nth(0).fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    await expect(page.getByText('Mot de passe mis à jour avec succès.')).toBeVisible();
    await page.waitForURL('**/login');
    await login(page, email);
    await expect(page.getByText('Email ou mot de passe incorrect', { exact: true })).toBeVisible();
    expect(await admin`select app_user_id from public.user_identities where provider='neon' and provider_user_id=${providerId}`).toHaveLength(0);
    await verify(page, email);
    await login(page, email);
    await page.waitForURL('**/complete-profile');
    await expect(page.getByRole('heading', { name: 'Finaliser votre espace' })).toBeVisible();
    await expect(page.getByLabel('Profil', { exact: true })).toHaveCount(0);
    await page.getByLabel('Nom de votre entreprise').fill('Synthetic recovered personal workspace');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.waitForURL('**/dashboard');
    const [recovered] = await admin`select id,profile_type,subscription_tier,organization_id from public.users where email=${email}`;
    expect(recovered).toMatchObject({ id: appId, profile_type: 'professional', subscription_tier: 'free' });
    expect(recovered.organization_id).not.toBe(missingOrg);
    expect(recovered.organization_id).toBeTruthy();
    expect(await admin`select app_user_id from public.user_identities where provider='neon' and provider_user_id=${providerId}`).toEqual([{ app_user_id: appId }]);
    await page.goto('/complete-profile');
    await page.waitForURL('**/dashboard');
    const [unchanged] = await admin`select organization_id from public.users where id=${appId}`;
    expect(unchanged.organization_id).toBe(recovered.organization_id);
    // A consumed reset link must fail in the actual UI.
    await page.goto(resetPath);
    await page.locator('input[type="password"]').nth(0).fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    await expect(page.getByText('Erreur lors de la mise à jour.')).toBeVisible();
  });
});
