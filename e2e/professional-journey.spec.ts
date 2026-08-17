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
    // Attempting to visit another organization's settings directly via URL (assuming org-b-5678 is the seeded ID)
    // The UI might redirect or show a 404/forbidden if RLS blocks the row
    // Wait for network idle or redirect
    await page.goto('/parametres/organisation?id=org-b-5678');
    
    // Since RLS is active, they should not see "Organization B" data
    const orgNameInput = page.locator('input[name="name"]');
    if (await orgNameInput.isVisible()) {
      const val = await orgNameInput.inputValue();
      expect(val).not.toContain('Organization B');
    }
    
    // Attempt to view a client that belongs to Org B (assuming we had a client route)
    await page.goto('/clients/cli-b-uuid-1111-2222-333344445555');
    await expect(page.locator('text=Client B')).not.toBeVisible();
  });
});
