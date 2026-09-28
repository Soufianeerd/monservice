import { test, expect } from '@playwright/test';

test.describe('Marketplace Workflow & Location Persistence', () => {
  const proEmail = 'pro_generic_a@monservice.com';
  const clientEmail = 'client_generic_a@monservice.com';
  const password = 'password123';

  test('MARKETPLACE_01: should display marketplace requests and allow clicking on one', async ({ page }) => {
    // Login as a professional
    await page.goto('/login');
    await page.fill('input[type="email"]', proEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Go to marketplace
    await page.goto('/marketplace');
    
    // Wait for the list to load
    await expect(page.locator('h1', { hasText: 'Marketplace' })).toBeVisible();
    
    // Check for requests in list
    const requestCard = page.locator('ul > li a, [data-testid="request-card"]').first();
    await expect(requestCard).toBeVisible();
    await requestCard.click();
    
    // Wait for navigation to details page
    await page.waitForURL('**/marketplace/*');
    // Check updated CTA: "Envoyer un devis" (replaces outdated "Répondre à cette demande")
    await expect(page.getByRole('link', { name: /Envoyer un devis/i })).toBeVisible();
  });

  test('MARKETPLACE_02: Client creates request with location, persisted in DB and displayed on detail', async ({ page }) => {
    const timestamp = Date.now();
    const title = `Demande Rénovation Salle d'eau #${timestamp}`;
    const specificLocation = `Lyon 7ème Jean Macé #${timestamp}`;

    // 1. Client creates request
    await page.goto('/login');
    await page.fill('input[name="email"]', clientEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/client/dashboard');

    await page.goto('/client/requests/new');
    await page.fill('[data-testid="request-title-input"]', title);
    await page.fill('[data-testid="request-description-input"]', 'Rénovation totale de plomberie et raccordements.');
    await page.selectOption('[data-testid="request-category-select"]', 'field_services');
    await page.fill('[data-testid="request-location-input"]', specificLocation);
    await page.fill('[data-testid="request-budget-input"]', '1200');
    await page.click('[data-testid="publish-request-btn"]');

    await page.waitForURL('**/client/requests*');
    await expect(page.locator(`text=${title}`)).toBeVisible();

    // 2. Pro logs in and views request in marketplace
    await page.goto('/login');
    await page.fill('input[type="email"]', proEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('/marketplace');
    await expect(page.locator(`text=${title}`)).toBeVisible();
    
    // Click on the specific created request
    await page.locator(`text=${title}`).click();
    await page.waitForURL('**/marketplace/*');

    // Verify location is displayed on page
    await expect(page.locator(`text=${specificLocation}`)).toBeVisible();

    // Reload page to verify true DB persistence
    await page.reload();
    await expect(page.locator(`text=${specificLocation}`)).toBeVisible();
    await expect(page.getByRole('link', { name: /Envoyer un devis/i })).toBeVisible();
  });
});
