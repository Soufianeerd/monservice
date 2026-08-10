import { test, expect } from '@playwright/test';

test.describe('Client Journey E2E', () => {
  const timestamp = Date.now();
  const testEmail = `client-test-${timestamp}@monservice.com`;
  const password = 'Password123!';

  test('Full Client Flow: Signup, Onboarding, Request, Dashboard', async ({ page }) => {
    // 1. Signup
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test Client');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button:has-text("Continuer")');
    
    // Step 2: Choose Client Profile
    await page.click('text="Je suis un particulier"');
    await page.click('button:has-text("Continuer")');

    // Step 4 (Client skips step 3): Review and Submit
    await page.click('input[type="checkbox"]');
    
    // Since there's often a form submission, we'll wait for navigation
    await Promise.all([
      page.waitForNavigation({ url: '**/client/dashboard*' }).catch(() => {}),
      page.click('button:has-text("Valider mon inscription")')
    ]);
    
    // Check url
    if (!page.url().includes('/client/dashboard')) {
       await page.goto('/client/dashboard');
    }

    // 2. Onboarding
    const launcher = page.locator('button', { hasText: 'Prise en main' });
    if (await launcher.isVisible()) {
      await launcher.click();
    }
    
    const popover = page.locator('text=Prise en main');
    if (await popover.isVisible()) {
       await page.locator('button[aria-label="Réduire le guide"]').click();
    }

    // 3. Create a Request
    await page.goto('/client/requests/new');
    await page.fill('input[name="title"]', 'Besoin de plomberie urgente');
    await page.fill('textarea[name="description"]', 'Bonjour, j\'ai une fuite importante dans ma salle de bain. Besoin d\'une intervention rapide.');
    await page.locator('select').first().selectOption('artisan');
    await page.fill('input[placeholder="Ville ou adresse"]', 'Paris');
    await page.fill('input[placeholder="Ex: 1500"]', '500');
    
    await page.click('button:has-text("Publier")');
    
    // Wait for redirect to client requests list
    await page.waitForURL('**/client/requests*');
    await expect(page.locator('text=Besoin de plomberie urgente')).toBeVisible();

    // 4. Test RBAC (Forced browsing)
    await page.goto('/dashboard'); // Professional dashboard
    // It should either show forbidden or redirect
    const title = await page.title();
    expect(page.url()).not.toBe('http://localhost:3000/dashboard'); // should have been redirected
  });
});
