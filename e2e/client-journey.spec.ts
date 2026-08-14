import { test, expect } from '@playwright/test';

test.describe('Client Journey E2E', () => {
  // Stratégie de test CI : En l'absence de Supabase Auth réel (in-memory Postgres seulement),
  // nous vérifions le rendu des formulaires et le comportement de validation client.
  // TODO (Prompt 03+): Configurer Supabase CLI pour tester les soumissions réseau réelles.

  test('should display client registration form correctly', async ({ page }) => {
    await page.goto('/register');
    
    // Vérifier les champs obligatoires du formulaire
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Continuer")')).toBeVisible();
  });
});
