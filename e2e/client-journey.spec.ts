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

test.describe('Client Journey E2E', () => {
  const testEmail = 'client_generic_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Authenticate using the seeded client
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/client/dashboard');
    await dismissSetupGuideIfPresent(page);
  });

  test('CLIENT_E2E_01: Client A can access client dashboard and create a request', async ({ page }) => {
    // 1. Dashboard access
    expect(page.url()).toContain('/client/dashboard');

    // 2. Create a Request
    await page.goto('/client/requests/new');
    await dismissSetupGuideIfPresent(page);
    
    await expect(page.locator('input[name="title"]')).toBeVisible();

    await page.fill('input[name="title"]', 'Besoin de plomberie urgente');
    await page.fill('textarea[name="description"]', 'Bonjour, j\'ai une fuite importante dans ma salle de bain. Besoin d\'une intervention rapide.');
    await page.locator('select[name="category"]').selectOption('field_services');
    await page.fill('input[name="location"]', 'Lyon');
    await page.fill('input[name="budget"]', '500');
    
    await dismissSetupGuideIfPresent(page);
    await page.click('[data-testid="publish-request-btn"]');
    
    // Wait for redirect to client requests list
    await page.waitForURL('**/client/requests*');
    await expect(page.locator('text=Besoin de plomberie urgente')).toBeVisible();
  });
});
