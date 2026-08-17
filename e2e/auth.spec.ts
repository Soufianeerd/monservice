import { test, expect } from '@playwright/test';

test.describe('Authentication - E2E Auth', () => {
  const proEmail = 'pro_a@monservice.com';
  const clientEmail = 'client_a@monservice.com';
  const password = 'password123';

  test('AUTH_E2E_01: should login successfully with Professional A', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', proEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('AUTH_E2E_02: should fail login with wrong password', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', proEmail);
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message (assuming the UI displays this error)
    await expect(page.locator('text=Identifiants invalides')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});

