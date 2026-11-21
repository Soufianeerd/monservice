import { test, expect, Page } from '@playwright/test';

// Invitation au portail client : le professionnel invite, le client accepte
// avec le compte de l'adresse invitée, puis le professionnel retire l'accès
// (le parcours remet la fiche dans son état initial et peut être rejoué).

const CLIENT_FICHE = '/clients/cli-generic-b-5678';
const INVITEE = 'client_generic_b@monservice.invalid';

async function dismissGuide(page: Page) {
  try {
    const closeBtn = page.locator('button[aria-label="Réduire le guide"], button[aria-label="Réduire l’aide"]');
    if (await closeBtn.isVisible({ timeout: 1500 })) await closeBtn.click({ force: true });
  } catch {
    // Guide absent.
  }
}

async function login(page: Page, email: string, landing: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', process.env.E2E_AUTH_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === landing);
  await dismissGuide(page);
}

async function openFiche(page: Page) {
  await page.goto(CLIENT_FICHE);
  await page.waitForURL((url) => url.pathname === CLIENT_FICHE);
  await dismissGuide(page);
}

test('CLIENT_INVITE_01: a professional invites a client who accepts, then access is removed', async ({ page }) => {
  await login(page, 'pro_generic_b@monservice.invalid', '/dashboard');
  await openFiche(page);
  const panel = page.locator('[data-testid="client-portal-access"]');
  await expect(panel.locator('[data-testid="client-portal-invite"]')).toBeVisible();
  await panel.locator('[data-testid="client-portal-email"]').fill(INVITEE);
  await dismissGuide(page);
  await panel.locator('[data-testid="client-portal-invite"]').click();
  const linkInput = panel.locator('[data-testid="client-portal-link"]');
  await expect(linkInput).toBeVisible();
  await expect(panel.locator('[data-testid="client-portal-pending"]')).toContainText(INVITEE);
  const invitationUrl = new URL(await linkInput.inputValue());
  expect(invitationUrl.pathname).toBe('/invitation/portail');

  // Sans session : la page publique propose la connexion et y revient ensuite.
  await page.context().clearCookies();
  await page.goto(invitationUrl.pathname + invitationUrl.search);
  await page.getByRole('link', { name: 'Se connecter' }).click();
  await page.fill('input[name="email"]', INVITEE);
  await page.fill('input[name="password"]', process.env.E2E_AUTH_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === '/invitation/portail');
  await dismissGuide(page);
  await page.locator('[data-testid="portal-invitation-accept"]').click();
  await page.waitForURL((url) => url.pathname.startsWith('/client/dashboard'));

  // Le lien est à usage unique.
  await page.goto(invitationUrl.pathname + invitationUrl.search);
  await expect(page.locator('[data-testid="portal-invitation"]')).toContainText('déjà acceptée');

  await login(page, 'pro_generic_b@monservice.invalid', '/dashboard');
  await openFiche(page);
  await expect(panel.locator('[data-testid="client-portal-linked"]')).toContainText(INVITEE);
  await dismissGuide(page);
  page.once('dialog', (dialog) => dialog.accept());
  await panel.getByRole('button', { name: 'Retirer l’accès' }).click();
  await expect(panel.locator('[data-testid="client-portal-invite"]')).toBeVisible();
});
