import { test, expect } from '@playwright/test';

test.describe('Contrôle d\'accès basé sur les rôles (RBAC)', () => {
  // Stratégie de test CI : En l'absence de Supabase Auth réel (in-memory Postgres seulement),
  // nous vérifions que les middlewares de sécurité protègent bien les routes.
  // TODO (Prompt 03+): Configurer Supabase CLI pour tester les rôles E2E avec de vrais tokens.

  test('Un utilisateur non authentifié est redirigé vers /login depuis le dashboard pro', async ({ page }) => {
    // Tenter d'accéder au CRM professionnel
    await page.goto('/dashboard');
    // Le middleware devrait le bloquer et le renvoyer vers /login
    expect(page.url()).toContain('/login');
  });

  test('Un utilisateur non authentifié est redirigé vers /login depuis le dashboard client', async ({ page }) => {
    // Tenter d'accéder à l'espace client
    await page.goto('/client/dashboard');
    // Le middleware devrait le bloquer et le renvoyer vers /login
    expect(page.url()).toContain('/login');
  });
});
