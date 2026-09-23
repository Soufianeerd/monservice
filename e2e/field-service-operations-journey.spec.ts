import { test, expect } from '@playwright/test';

test.describe('Field Service Operations Journey E2E (Session 17)', () => {
  const proEmail = 'pro_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Login as professional
    await page.goto('/login');
    await page.fill('input[name="email"]', proEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));
  });

  test('FIELD_SERVICE_E2E_01: Desktop Operations Journey (1440x900) - Dashboard to Operations List and Creation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Check Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Navigate to Operations List
    await page.goto('/operations');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/Opérations|Interventions|Chantiers/i);

    // 3. Navigate to New Operation Form
    await page.goto('/operations/nouveau');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });

  test('FIELD_SERVICE_E2E_02: Mobile Viewport Smoke (390x844) - Operations UI responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Check Dashboard on Mobile
    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Check Operations on Mobile
    await page.goto('/operations');
    await expect(page.locator('h1').first()).toBeVisible();

    // 3. Check New Operation on Mobile
    await page.goto('/operations/nouveau');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });
});
