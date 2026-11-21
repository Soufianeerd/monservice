import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { signInFixture } from './helpers/sign-in-fixture';

// Périmètre V1 : ce parcours tourne SANS `CLIENT_ACCESS_ENABLED`, c'est-à-dire
// dans la configuration de production. Les specs des portails, conservées pour
// la version suivante, tournent dans une passe distincte avec l'indicateur.
test.describe('V1 — réservé aux professionnels', () => {
  test.describe.configure({ mode: 'serial' });
  const proEmail = 'pro_fs_a@monservice.invalid';
  const clientEmail = 'client_fs_a@monservice.invalid';

  test.beforeAll(() => {
    if (process.env.CLIENT_ACCESS_ENABLED === 'true') throw new Error('Cette passe exige les espaces clients fermés');
  });

  test('l’inscription ne propose que le profil professionnel', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[name="name"]').fill('Synthetic V1 visitor');
    await page.locator('input[name="email"]').fill(`v1-visitor-${randomUUID()}@monservice.invalid`);
    await page.locator('input[name="password"]').fill(process.env.E2E_AUTH_PASSWORD!);
    await page.locator('input[name="confirmPassword"]').fill(process.env.E2E_AUTH_PASSWORD!);
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    // Sans choix de profil : on arrive directement sur l'activité professionnelle.
    await expect(page.locator('input[name="orgName"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Je suis un particulier/ })).toHaveCount(0);
  });

  test('l’invitation au portail et la page d’information répondent sans session', async ({ page }) => {
    await page.goto('/invitation/portail?token=anything');
    await expect(page.getByRole('heading', { name: 'Espace client indisponible' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveCount(0);
    await page.goto('/acces-clients');
    await expect(page.getByTestId('client-access-unavailable')).toBeVisible();
  });

  test('un compte client existant n’atteint aucun espace client', async ({ page }) => {
    await signInFixture(page, clientEmail, /\/acces-clients$/);
    for (const path of ['/client/dashboard', '/client/interventions', '/client/sante', `/devis/${randomUUID()}/sign`, '/dashboard']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/acces-clients$/);
    }
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await page.waitForURL(/\/login(?:\?|$)/);
  });

  test('le professionnel consigne l’accord de son client et poursuit vers l’acompte', async ({ page }) => {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    const quoteId = randomUUID();
    try {
      const [client] = await sql`select id, organization_id from clients where email = ${clientEmail} limit 1`;
      const [pro] = await sql`select id from users where email = ${proEmail} limit 1`;
      const now = new Date().toISOString();
      await sql`insert into invoices (id, organization_id, client_id, type, number, date, status, total_ht, tax_amount, total_ttc, created_at, updated_at)
        values (${quoteId}, ${client.organization_id}, ${client.id}, 'quote', ${'DEV-V1-' + Date.now()}, ${now}, 'sent', 100, 20, 120, ${now}, ${now})`;

      await signInFixture(page, proEmail, /\/dashboard/);
      await page.goto(`/facturation/devis/${quoteId}`);
      await expect(page.getByTestId('quote-decision-panel')).toBeVisible();
      await page.getByTestId('quote-decision-method').selectOption('signed_document');
      await page.getByTestId('record-quote-accepted-button').click();
      await expect(page.getByTestId('quote-status-badge')).toContainText(/Accepté/i);
      await expect(page.getByTestId('quote-decision-panel')).toHaveCount(0);

      const [accepted] = await sql`select status, accepted_at, accepted_by_user_id, signature, message from invoices where id = ${quoteId}`;
      expect(accepted.status).toBe('accepted');
      expect(accepted.accepted_at).toBeTruthy();
      expect(accepted.accepted_by_user_id).toBe(pro.id);
      // Aucune signature électronique n'est inventée pour le client.
      expect(accepted.signature).toBeNull();
      expect(accepted.message).toContain('sur document signé');
    } finally {
      await sql.end();
    }
  });
});
