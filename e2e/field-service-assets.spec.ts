import { test, expect, Page } from '@playwright/test';

// Session 19 — Customer Assets & Equipment Tracking, parcours navigateur réel.

async function dismissGuide(page: Page) {
  try {
    const closeBtn = page.locator('button[aria-label="Réduire le guide"], button[aria-label="Réduire l’aide"]');
    if (await closeBtn.isVisible({ timeout: 1500 })) await closeBtn.click({ force: true });
  } catch {
    // Guide absent.
  }
}

test.describe('Field Service customer assets (Session 19)', () => {
  const proEmail = 'pro_fs_a@monservice.invalid';
  const password = process.env.E2E_AUTH_PASSWORD!;
  const clientName = 'Client Field Service A';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', proEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));
    await dismissGuide(page);
  });

  test('ASSETS_01: register an asset, link it to an intervention and read its history', async ({ page }) => {
    const runId = Date.now();
    const assetLabel = `Chaudière E2E #${runId}`;
    const serial = `SN-E2E-${runId}`;
    const workTitle = `Entretien chaudière #${runId}`;

    // 1. Register the asset.
    await page.goto('/operations/equipements');
    await dismissGuide(page);
    await expect(page.getByRole('heading', { name: 'Équipements clients' })).toBeVisible();
    await page.click('[data-testid="new-asset-button"]');
    await page.selectOption('[data-testid="asset-client-select"]', { label: clientName });
    await page.selectOption('[data-testid="asset-category-select"]', 'heating');
    await page.fill('[data-testid="asset-label-input"]', assetLabel);
    await page.fill('[data-testid="asset-manufacturer-input"]', 'Viessmann');
    await page.fill('[data-testid="asset-model-input"]', 'Vitodens 100-W');
    await page.fill('[data-testid="asset-serial-input"]', serial);
    await page.fill('[data-testid="asset-installed-input"]', '2024-03-01');
    await page.fill('[data-testid="asset-warranty-input"]', '2029-03-01');
    await page.click('[data-testid="asset-submit"]');

    await page.waitForURL(/\/operations\/equipements\/[0-9a-f-]{36}$/);
    const assetUrl = page.url();
    await dismissGuide(page);
    await expect(page.locator('[data-testid="asset-title"]')).toHaveText(assetLabel);
    await expect(page.locator('[data-testid="asset-detail"]')).toContainText(serial);
    await expect(page.locator('[data-testid="asset-detail"]')).toContainText('Sous garantie');
    await expect(page.locator('[data-testid="asset-history"]')).toContainText('Aucune intervention rattachée');

    // 2. A duplicate serial for the same manufacturer is refused with a readable message.
    await page.goto('/operations/equipements');
    await dismissGuide(page);
    await page.click('[data-testid="new-asset-button"]');
    await page.selectOption('[data-testid="asset-client-select"]', { label: clientName });
    await page.fill('[data-testid="asset-label-input"]', `${assetLabel} doublon`);
    await page.fill('[data-testid="asset-manufacturer-input"]', 'Viessmann');
    await page.fill('[data-testid="asset-serial-input"]', serial);
    await page.click('[data-testid="asset-submit"]');
    await expect(page.locator('[data-testid="new-asset-form"] [role="alert"]')).toContainText('numéro de série');
    await page.getByRole('button', { name: 'Annuler' }).click();

    // 3. The list finds it by serial number.
    await page.fill('[data-testid="asset-search"]', serial);
    await expect(page.locator('[data-testid="asset-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="asset-row"]')).toContainText(assetLabel);

    // 4. Create an intervention for the same client and attach the asset.
    await page.goto('/operations/nouveau');
    await dismissGuide(page);
    await page.selectOption('[data-testid="client-select"]', { label: clientName });
    await page.fill('[data-testid="title-input"]', workTitle);
    await page.selectOption('[data-testid="work-type-select"]', 'maintenance');
    await page.click('[data-testid="submit-operation-button"]', { force: true });
    await page.waitForURL(/\/operations\/[0-9a-f-]{36}$/);
    await dismissGuide(page);

    const panel = page.locator('[data-testid="work-order-assets"]');
    await expect(panel).toContainText('Aucun équipement rattaché');
    await panel.locator('[data-testid="asset-link-select"]').selectOption({ label: `${assetLabel} (N° ${serial})` });
    await panel.locator('[data-testid="asset-link-submit"]').click();
    await expect(panel.locator('[data-testid="linked-assets"]')).toContainText(assetLabel);

    // 5. The asset history shows the intervention after a full reload.
    await page.goto(assetUrl);
    await dismissGuide(page);
    await expect(page.locator('[data-testid="asset-history"]')).toContainText(workTitle);

    // 6. Out of service, then decommissioned: the record becomes read-only.
    await page.click('[data-testid="asset-mark-out-of-service"]');
    await expect(page.locator('[data-testid="asset-status-badge"]')).toHaveText('Hors service');
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('[data-testid="asset-decommission"]');
    await expect(page.locator('[data-testid="asset-status-badge"]')).toHaveText('Retiré / mis au rebut');
    await page.reload();
    await expect(page.locator('[data-testid="asset-detail"]')).toContainText('lecture seule');
    await expect(page.locator('[data-testid="asset-edit-toggle"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="asset-history"]')).toContainText(workTitle);
  });
});
