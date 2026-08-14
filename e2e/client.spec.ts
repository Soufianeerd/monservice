import { test, expect } from '@playwright/test';

test.describe('Client Management', () => {
  // Stratégie de test CI : En l'absence de Supabase Auth réel (in-memory Postgres seulement),
  // nous vérifions que les routes protégées nécessitent une authentification.
  // TODO (Prompt 03+): Configurer Supabase CLI pour tester la gestion des clients E2E.

  test('should redirect unauthenticated users away from clients list', async ({ page }) => {
    await page.goto('/clients');
    // Vérifier la redirection ou l'état non-autorisé
    expect(page.url()).not.toBe('http://localhost:3000/clients');
  });
});
