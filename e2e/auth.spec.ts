import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const timestamp = Date.now();
  const testEmail = `testuser${timestamp}@example.com`;
  const password = 'Password123!';

  test('should register a new professional user', async ({ page }) => {
    await page.goto('/register');
    
    // Fill the registration form
    await page.fill('input[name="name"]', 'Test Professional');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    
    // Choose professional profile if a select/radio exists (Assuming based on prompt)
    // If there's a profileType radio button:
    const profileTypeExists = await page.isVisible('input[value="professional"]');
    if (profileTypeExists) {
      await page.check('input[value="professional"]');
    }
    
    await page.click('button[type="submit"]');

    // Wait for redirect to login or dashboard
    await page.waitForURL('**/login*');
    expect(page.url()).toContain('/login');
  });

  test('should login successfully with registered user', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('should fail login with wrong password', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMsg = await page.locator('text=Email ou mot de passe incorrect').isVisible();
    expect(errorMsg).toBeTruthy();
  });
});
