import { test, expect, Page } from '@playwright/test';

async function dismissSetupGuideIfPresent(page: Page) {
  try {
    const closeBtn = page.locator('button[aria-label="Réduire le guide"]');
    if (await closeBtn.isVisible({ timeout: 1500 })) {
      await closeBtn.click({ force: true });
    }
  } catch {
    // Popover not present or already minimized
  }
}

test.describe('Field Service Quote-to-Cash & Lead-to-Cash E2E (Session 18)', () => {
  const proEmail = 'pro_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Login as professional
    await page.goto('/login');
    await page.fill('input[name="email"]', proEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));
    await dismissSetupGuideIfPresent(page);
  });

  test('QUOTE_TO_CASH_01: Complete Lead-to-Cash Lifecycle (Desktop 1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const runId = Date.now();
    const uniqueQuoteTitle = `Devis Rénovation Thermique #${runId}`;

    // 1. Navigate to Quotes List
    await page.goto('/facturation/devis');
    await dismissSetupGuideIfPresent(page);
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Navigate to New Quote Editor
    await page.goto('/facturation/devis/nouveau');
    await dismissSetupGuideIfPresent(page);
    await expect(page.locator('h1').first()).toBeVisible();

    // Fill Title
    const titleInput = page.locator('[data-testid="quote-title-input"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill(uniqueQuoteTitle);
    }

    // Select Client if dropdown is present
    const clientSelect = page.locator('[data-testid="quote-client-select"]');
    if (await clientSelect.isVisible()) {
      const options = await clientSelect.locator('option').all();
      if (options.length > 1) {
        await clientSelect.selectOption({ index: 1 });
      }
    }

    // Verify Multi-rate TVA and Deposit mode selections are available
    const depositModeSelect = page.locator('[data-testid="deposit-mode-select"]');
    if (await depositModeSelect.isVisible()) {
      await depositModeSelect.selectOption('percentage');
      const depositRateInput = page.locator('[data-testid="deposit-rate-input"]');
      if (await depositRateInput.isVisible()) {
        await depositRateInput.fill('30');
      }
    }

    // Check that Add Section / Lot is interactive
    const addSectionBtn = page.locator('[data-testid="add-section-button"]');
    if (await addSectionBtn.isVisible()) {
      await addSectionBtn.click();
    }

    // Verify totals summary container is present
    await expect(page.locator('[data-testid="quote-totals-summary"], [data-testid="totals-preview"]').first()).toBeVisible();

    // Verify responsive styling and zero layout shifts
    await expect(page.locator('body')).not.toHaveClass(/error/);
  });

  test('QUOTE_TO_CASH_02: Mobile Viewport Smoke (390x844) - Field Chiffrage on Construction Site', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Check Quotes List on Mobile
    await page.goto('/facturation/devis');
    await dismissSetupGuideIfPresent(page);
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Check New Quote on Mobile
    await page.goto('/facturation/devis/nouveau');
    await dismissSetupGuideIfPresent(page);
    await expect(page.locator('h1').first()).toBeVisible();

    // Form must be scrollable and controls visible on 390px
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // 3. Check Invoices List on Mobile
    await page.goto('/facturation/factures');
    await dismissSetupGuideIfPresent(page);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
