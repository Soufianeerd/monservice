import { test, expect } from '@playwright/test';

test.describe('Paramedical Practitioner Journey E2E (Session 15)', () => {
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

  test('PRACTITIONER_E2E_01: Desktop Journey (1440x900) - Dashboard to Patients and Agenda', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Patients registry
    await page.goto('/patients');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Navigate to Agenda & Planning
    await page.goto('/agenda');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 3. Navigate to Practice Settings
    await page.goto('/parametres/cabinet');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('PRACTITIONER_E2E_02: Mobile Viewport Smoke (390x844) - Navigation and UI responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Check Dashboard on Mobile
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Check Patients list on Mobile
    await page.goto('/patients');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 3. Check Agenda on Mobile
    await page.goto('/agenda');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
