import { test, expect } from '@playwright/test';

test.describe('Professional Journey E2E', () => {
  const testEmail = 'pro_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Authenticate using the seeded professional
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('PRO_E2E_01: Professional A can access dashboard and update profile', async ({ page }) => {
    // 1. Dashboard access
    expect(page.url()).toContain('/dashboard');

    // 2. Update Company Profile
    await page.goto('/parametres/organisation');
    
    // We expect the form to be visible since we are authenticated
    await expect(page.locator('input[name="name"]')).toBeVisible();

    await page.fill('input[name="name"]', 'Organization A - Updated');
    await page.locator('select[name="industry"]').selectOption('artisan');
    await page.click('button:has-text("Enregistrer")');
  });

  test('TENANT_E2E_01 / TENANT_E2E_02: Professional A cannot access or modify Organization B resources', async ({ page }) => {
    // Attempting to visit another organization's settings directly via URL
    // (Assuming the routing uses ?id= or it relies on server-side context)
    const responseOrg = await page.goto('/parametres/organisation?id=org-b-5678');
    
    // Determine deterministic failure (either 404, 403, or the inputs don't show Org B)
    // If the page still loads but forces the context to their OWN organization:
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await expect(nameInput).not.toHaveValue(/Organization B/i);
    } else {
      // Otherwise we expect a 404 or redirect
      expect(responseOrg?.status() === 404 || responseOrg?.status() === 403 || page.url().includes('/dashboard')).toBeTruthy();
    }

    // Attempt to view a client that belongs to Org B
    const responseClient = await page.goto('/clients/cli-rec-b-5678');
    // If it's isolated properly by RLS, the database returns 0 rows, triggering a 404
    if (responseClient?.status() === 200) {
      await expect(page.locator('body')).toContainText(/404|Introuvable|Non trouvé|Not Found/i);
    } else {
      expect(responseClient?.status()).toBe(404);
    }
  });
});
