import { test, expect } from '@playwright/test';

test.describe('Patient Portal Journey E2E (Session 14)', () => {
  const testEmail = 'client_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Authenticate using the seeded client with direct callbackUrl to portal
    await page.goto('/login?callbackUrl=/client/sante');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/client/sante**');
  });

  test('PATIENT_PORTAL_E2E_01: Patient can access Suivi Santé dashboard and sections', async ({ page }) => {
    // 1. Navigate to Suivi Sante
    await page.goto('/client/sante');
    
    // Check main title and modules
    await expect(page.locator('h1')).toContainText('Suivi de vos soins');
    
    // Check navigation buttons to sub-sections
    await expect(page.locator('text=Rendez-vous')).toBeVisible();
    await expect(page.locator('text=Documents')).toBeVisible();
    await expect(page.locator('text=Questionnaires')).toBeVisible();
    await expect(page.locator('text=Factures & Règlements')).toBeVisible();
    await expect(page.locator('text=Messagerie')).toBeVisible();
  });

  test('PATIENT_PORTAL_E2E_02: Patient can navigate to appointments projection', async ({ page }) => {
    await page.goto('/client/sante/rendez-vous');
    await expect(page.locator('h1')).toContainText('Mes Rendez-vous');
  });

  test('PATIENT_PORTAL_E2E_03: Patient can navigate to shared documents', async ({ page }) => {
    await page.goto('/client/sante/documents');
    await expect(page.locator('h1')).toContainText('Documents Médicaux');
  });

  test('PATIENT_PORTAL_E2E_04: Patient can navigate to questionnaires', async ({ page }) => {
    await page.goto('/client/sante/questionnaires');
    await expect(page.locator('h1')).toContainText('Questionnaires');
  });

  test('PATIENT_PORTAL_E2E_05: Patient can navigate to invoices and payments', async ({ page }) => {
    await page.goto('/client/sante/factures');
    await expect(page.locator('h1')).toContainText('Mes Factures de Soins');
  });

  test('PATIENT_PORTAL_E2E_06: Patient can navigate to messaging', async ({ page }) => {
    await page.goto('/client/sante/messages');
    await expect(page.locator('h1')).toContainText('Messagerie');
  });
});
