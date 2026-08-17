import { test, expect } from '@playwright/test';

test.describe('Marketplace Workflow', () => {
  test('should display marketplace requests and allow clicking on one', async ({ page }) => {
    // Login as a professional
    await page.goto('/login');
    await page.fill('input[type="email"]', 'freelance@monservice.com'); // assume seeded user
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Go to marketplace
    await page.goto('/marketplace');
    
    // Wait for the list to load
    await expect(page.locator('h1', { hasText: 'Marketplace' })).toBeVisible();
    
    // Wait for at least one request to be visible and click it
    const firstRequest = page.locator('ul > li').first();
    await expect(firstRequest).toBeVisible();
    await firstRequest.click();
    
    // Wait for navigation to details page
    await page.waitForURL('**/marketplace/*');
    await expect(page.locator('button', { hasText: 'Répondre à cette demande' })).toBeVisible();
  });
});
