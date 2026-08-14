import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  // Stratégie de test CI : En l'absence de Supabase Auth réel (in-memory Postgres seulement),
  // nous vérifions le rendu des formulaires et le comportement de validation client.
  // TODO (Prompt 03+): Configurer Supabase CLI pour tester les soumissions réseau réelles.

  test('should display registration form correctly', async ({ page }) => {
    await page.goto('/register');
    
    // Vérifier les champs obligatoires du formulaire
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Continuer")')).toBeVisible();
  });

  test('should display login form correctly', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Tenter d'accéder à une route protégée sans auth devrait rediriger
    // ou afficher un état d'erreur géré par le middleware.
    const res = await page.goto('/dashboard');
    // Le middleware Next.js devrait rediriger vers /login
    expect(page.url()).toContain('/login');
  });
});
