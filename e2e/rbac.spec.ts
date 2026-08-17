import { test, expect } from '@playwright/test';

test.describe('Contrôle d\'accès basé sur les rôles (RBAC)', () => {
  const clientEmail = 'client_a@monservice.com';
  const proEmail = 'pro_a@monservice.com';
  const password = 'password123';

  test('RBAC_E2E_01: Un client est redirigé s\'il tente d\'accéder au dashboard pro', async ({ page }) => {
    // Naviguer vers la page de login
    await page.goto('/login');
    
    // Remplir les informations d'un client
    await page.fill('input[type="email"]', clientEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers /client/dashboard
    await page.waitForURL('**/client/dashboard');
    expect(page.url()).toContain('/client/dashboard');

    // Tenter d'accéder au CRM professionnel
    await page.goto('/dashboard');
    
    // Le middleware devrait le bloquer et le renvoyer vers /forbidden (ou /client/dashboard)
    await page.waitForURL('**/forbidden');
    expect(page.url()).toContain('/forbidden');
  });

  test('RBAC_E2E_02: Un professionnel accède correctement à son dashboard mais pas à l\'espace client', async ({ page }) => {
    await page.goto('/login');
    
    // Remplir les informations du pro
    await page.fill('input[type="email"]', proEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers /dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Tenter d'accéder à l'espace client
    await page.goto('/client/dashboard');
    
    // Le middleware devrait le bloquer et le renvoyer vers /forbidden
    await page.waitForURL('**/forbidden');
    expect(page.url()).toContain('/forbidden');
  });

});
