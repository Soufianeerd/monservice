import { test, expect, Page } from '@playwright/test';

async function dismissSetupGuideIfPresent(page: Page) {
  try {
    const closeBtn = page.locator('button[aria-label="Réduire le guide"]');
    if (await closeBtn.isVisible({ timeout: 1000 })) {
      await closeBtn.click({ force: true });
    }
    const dismissBtn = page.locator('button:has-text("Ne plus afficher ce guide")');
    if (await dismissBtn.isVisible({ timeout: 1000 })) {
      await dismissBtn.click({ force: true });
    }
  } catch {
    // Popover not present
  }
}

test.describe('Client Management', () => {
  const testEmail = 'pro_generic_a@monservice.com';
  const password = 'password123';

  // Use a predefined logged-in state if possible, or login before each
  // For now, we assume we need to login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    // Using a seeded test account for e2e tests
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await dismissSetupGuideIfPresent(page);
  });

  test('should create a new client and display it in the list', async ({ page }) => {
    await page.goto('/clients/new');
    await dismissSetupGuideIfPresent(page);
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 15000 });
    
    const timestamp = Date.now();
    const clientName = `Entreprise Test ${timestamp}`;
    
    // Fill client form
    await page.fill('input[name="name"]', clientName);
    await page.fill('input[name="email"]', `contact-${timestamp}@test.com`);
    await dismissSetupGuideIfPresent(page);
    await page.click('button[type="submit"]');

    // After creating client, it redirects to /clients/[id] (not /clients/new)
    await page.waitForURL(url => url.pathname.startsWith('/clients/') && url.pathname !== '/clients/new', { timeout: 15000 });
    await expect(page.locator(`text=${clientName}`).first()).toBeVisible({ timeout: 15000 });
  });
});
