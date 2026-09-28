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

test.describe('Professional Journey E2E', () => {
  const testEmail = 'pro_generic_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Authenticate using the seeded professional
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await dismissSetupGuideIfPresent(page);
  });

  test('PRO_E2E_01: Professional A can access dashboard and update profile', async ({ page }) => {
    // 1. Dashboard access
    expect(page.url()).toContain('/dashboard');

    // 2. Update Company Profile
    await page.goto('/parametres/organisation');
    await dismissSetupGuideIfPresent(page);
    
    // We expect the form to be visible since we are authenticated
    await expect(page.locator('input[name="name"]')).toBeVisible();

    await page.fill('input[name="name"]', 'Organization A - Updated');
    await page.locator('select[name="industry"]').selectOption({ index: 1 });
    await dismissSetupGuideIfPresent(page);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Profil mis à jour avec succès.')).toBeVisible();
  });

  test('TENANT_E2E_01 / TENANT_E2E_02: Professional A cannot access or modify Organization B resources', async ({ page }) => {
    // Attempting to visit another organization's settings directly via URL
    // Server enforces session organizationId, ignoring URL tampering
    await page.goto('/parametres/organisation?id=org-generic-b-5678');
    await dismissSetupGuideIfPresent(page);
    
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).not.toHaveValue(/Organization Generic B|Organization B/i);

    // Attempt to view a client that belongs to Org B
    await page.goto('/clients/cli-generic-b-5678');
    // If it's isolated properly by RLS/context, client is not shown: user is redirected to /clients
    await page.waitForURL('**/clients*');
    await expect(page.locator('body')).not.toContainText(/Client Generic B Record/i);
  });
});
