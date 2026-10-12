import { expect, type Page } from '@playwright/test';

/** Connexion réelle du navigateur. Seul un HTTP 429 est rejoué, jamais un refus d’identité. */
export async function signInFixture(page: Page, email: string, destination: RegExp) {
  await page.goto('/login');
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 45_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(process.env.E2E_AUTH_PASSWORD!);
  for (let attempt = 0; attempt < 3; attempt++) {
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/sign-in/email' && response.request().method() === 'POST', { timeout: 20_000 });
    await page.locator('button[type="submit"]').click();
    const response = await responsePromise;
    if (response.status() !== 429) {
      expect(response.ok(), `Connexion de fixture refusée : HTTP ${response.status()}`).toBe(true);
      await expect(page).toHaveURL(destination, { timeout: 45_000 });
      return;
    }
    if (attempt === 2) throw new Error('Limite de connexion de fixture encore atteinte après trois tentatives');
    const retry = response.headers()['retry-after'];
    const seconds = retry && /^\d+(\.\d+)?$/.test(retry) ? Number(retry) : retry ? (Date.parse(retry) - Date.now()) / 1000 : 30;
    const delay = Math.min(30_000, Math.max(1000, Number.isFinite(seconds) ? seconds * 1000 : 30_000));
    await page.waitForTimeout(delay);
  }
}
