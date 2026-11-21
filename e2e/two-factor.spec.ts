import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { signInFixture } from './helpers/sign-in-fixture';

const email = 'pro_two_factor@monservice.invalid';

/** TOTP RFC 6238 calculé indépendamment de l'application (comme le ferait un téléphone). */
function totp(secretBase32: string, offsetSteps = 0): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of secretBase32.replace(/\s/g, '')) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const code = ((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

async function passwordStep(page: Page) {
  await signInFixture(page, email, /\/verification-2fa/);
}

test.describe.serial('Double authentification', () => {
  let secret = '';
  let recoveryCodes: string[] = [];

  test('activation depuis les paramètres de sécurité', async ({ page }) => {
    await signInFixture(page, email, /\/dashboard/);
    await page.goto('/parametres/securite');
    await expect(page.getByTestId('two-factor-status')).toContainText('Inactive');
    await page.getByRole('button', { name: 'Activer la double authentification' }).click();
    secret = (await page.getByTestId('two-factor-secret').innerText()).replace(/\s/g, '');
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    await page.getByLabel(/code à 6 chiffres/).fill('000000');
    await page.getByRole('button', { name: 'Activer', exact: true }).click();
    await expect(page.getByTestId('two-factor-error')).toContainText('Code incorrect');
    await page.getByLabel(/code à 6 chiffres/).fill(totp(secret));
    await page.getByRole('button', { name: 'Activer', exact: true }).click();
    const codes = page.getByTestId('recovery-codes').locator('li');
    await expect(codes).toHaveCount(10);
    recoveryCodes = await codes.allInnerTexts();
    await page.getByRole('button', { name: 'J’ai enregistré mes codes' }).click();
    await expect(page.getByTestId('two-factor-status')).toContainText('Active');
    // La session qui a activé le facteur reste ouverte.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('le mot de passe seul n’ouvre ni les pages ni les actions', async ({ page }) => {
    await passwordStep(page);
    await page.goto('/clients');
    await expect(page).toHaveURL(/\/verification-2fa/);
    await page.getByLabel('Code de vérification').fill('123456');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.getByTestId('second-factor-error')).toContainText('Code incorrect');
    // Pas suivant (dérive tolérée) : le code d'activation ne peut pas resservir.
    await page.getByLabel('Code de vérification').fill(totp(secret, 1));
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('un code de secours sert une seule fois', async ({ page }) => {
    await passwordStep(page);
    await page.getByRole('button', { name: 'Utiliser un code de secours' }).click();
    await page.getByLabel('Code de secours').fill(recoveryCodes[0]);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.context().clearCookies();
    await passwordStep(page);
    await page.getByRole('button', { name: 'Utiliser un code de secours' }).click();
    await page.getByLabel('Code de secours').fill(recoveryCodes[0]);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page.getByTestId('second-factor-error')).toContainText('déjà utilisé');
  });

  test('désactivation avec un code de secours', async ({ page }) => {
    await passwordStep(page);
    await page.getByRole('button', { name: 'Utiliser un code de secours' }).click();
    await page.getByLabel('Code de secours').fill(recoveryCodes[1]);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/parametres/securite');
    await page.getByRole('button', { name: 'Désactiver' }).click();
    await page.getByLabel(/Pour désactiver/).fill(recoveryCodes[2]);
    await page.getByRole('button', { name: 'Désactiver' }).click();
    await expect(page.getByTestId('two-factor-status')).toContainText('Inactive');
    await page.context().clearCookies();
    await signInFixture(page, email, /\/dashboard/);
  });
});
