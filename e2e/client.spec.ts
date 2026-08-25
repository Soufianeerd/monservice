import { test, expect } from '@playwright/test';

test.describe('Client Management', () => {
  // Use a predefined logged-in state if possible, or login before each
  // For now, we assume we need to login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    // Using a seeded test account for e2e tests
    await page.fill('input[type="email"]', 'pro_a@monservice.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should create a new client and display it in the list', async ({ page }) => {
    await page.goto('/clients/new');
    
    const timestamp = Date.now();
    const clientName = `Entreprise Test ${timestamp}`;
    
    // Fill client form
    await page.fill('input[name="name"]', clientName);
    await page.fill('input[name="email"]', `contact-${timestamp}@test.com`);
    await page.click('button[type="submit"]');

    // Wait for redirect to clients list
    await page.waitForURL('**/clients*');
    
    // Check if the new client is in the list
    await expect(page.locator(`text=${clientName}`)).toBeVisible();
  });
});
