import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Session 20 — du compte rendu finalisé par l'artisan à la réception signée par le client.

async function dismissGuide(page: Page) {
  try {
    const closeBtn = page.locator('button[aria-label="Réduire le guide"], button[aria-label="Réduire l’aide"]');
    if (await closeBtn.isVisible({ timeout: 1500 })) await closeBtn.click({ force: true });
  } catch {
    // Guide absent.
  }
}

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', process.env.E2E_AUTH_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await dismissGuide(page);
}

// Trois étapes enchaînées : l'état passe par un fichier temporaire pour pouvoir
// rejouer chaque étape séparément (-g) tout en restant un seul parcours en CI.
const stateFile = path.join(os.tmpdir(), 'monservice-client-portal-e2e.json');
type PortalState = { title: string; summary: string; operationUrl: string };
const readState = (): PortalState => JSON.parse(fs.readFileSync(stateFile, 'utf8'));

test.describe.configure({ mode: 'serial' });

test('CLIENT_PORTAL_01a: the professional finalizes a report for a portal client', async ({ page }) => {
  const runId = Date.now();
  const title = `Remplacement robinet #${runId}`;
  const summary = `Robinet remplacé #${runId}`;

  await login(page, 'pro_fs_a@monservice.invalid');
  await page.goto('/operations/nouveau');
  await dismissGuide(page);
  await page.selectOption('[data-testid="client-select"]', { label: 'Client Field Service A' });
  await page.fill('[data-testid="title-input"]', title);
  await page.fill('[data-testid="scheduled-start-input"]', '2026-12-01T09:00');
  await page.fill('[data-testid="scheduled-end-input"]', '2026-12-01T11:00');
  await dismissGuide(page);
  await page.click('[data-testid="submit-operation-button"]');
  await page.waitForURL(/\/operations\/[0-9a-f-]{36}$/);
  const operationUrl = page.url();
  await dismissGuide(page);
  await page.click('[data-testid="start-operation-button"]');
  await expect(page.locator('[data-testid="operation-status-badge"]')).toContainText('En cours');
  await page.click('[data-testid="create-report-button"]');
  await page.fill('input[placeholder="Ex: Remplacement vanne générale effectué avec succès"]', summary);
  await page.fill('textarea[placeholder="Détails des opérations techniques menées..."]', 'Remplacement du mitigeur de cuisine.');
  await page.click('[data-testid="submit-report-button"]');
  await expect(page.locator(`text=${summary}`)).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.click('[data-testid="finalize-report-button"]');
  await expect(page.locator('text=Finalisé (Immuable)')).toBeVisible();
  await expect(page.locator('[data-testid="client-acknowledgements"]')).toContainText('Aucune réception signée');
  fs.writeFileSync(stateFile, JSON.stringify({ title, summary, operationUrl } satisfies PortalState));
});

test('CLIENT_PORTAL_01b: the client follows the intervention and signs with reservations', async ({ page }) => {
  const { title, summary } = readState();
  await login(page, 'client_fs_a@monservice.invalid');
  await page.goto('/client/dashboard');
  await page.click('[data-testid="client-dashboard-interventions"]');
  await page.waitForURL('**/client/interventions');
  const row = page.locator('[data-testid="client-intervention-row"]', { hasText: title });
  await expect(row).toContainText('Réception à signer');
  await row.click();
  await page.waitForURL(/\/client\/interventions\/[0-9a-f-]{36}$/);
  await expect(page.locator('[data-testid="client-intervention-status"]')).toHaveText('En cours');
  const report = page.locator('[data-testid="client-report"]', { hasText: summary });
  await report.locator('[data-testid="client-ack-signer"]').fill('Claire Client');
  await report.locator('[data-testid="client-ack-reservations"]').check();
  await report.locator('[data-testid="client-ack-comment"]').fill('Léger goutte-à-goutte à surveiller');
  await expect(report.locator('[data-testid="client-ack-submit"]')).toBeDisabled();
  await report.locator('[data-testid="client-ack-confirm"]').check();
  await report.locator('[data-testid="client-ack-submit"]').click();
  await expect(report.locator('[data-testid="client-report-acknowledged"]')).toContainText('Claire Client');
  await page.reload();
  await expect(page.locator('[data-testid="client-report-acknowledged"]')).toContainText('avec réserves');
  await expect(page.locator('[data-testid="client-ack-form"]')).toHaveCount(0);
});

test('CLIENT_PORTAL_01c: the professional sees the signed acceptance', async ({ page }) => {
  const { operationUrl } = readState();
  await login(page, 'pro_fs_a@monservice.invalid');
  await page.goto(operationUrl);
  await dismissGuide(page);
  await expect(page.locator('[data-testid="client-acknowledgements"]')).toContainText('Acceptée avec réserves — Claire Client');
  await expect(page.locator('[data-testid="client-acknowledgements"]')).toContainText('goutte-à-goutte');
});
