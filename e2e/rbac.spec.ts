import { test, expect } from '@playwright/test';

// Configuration de base : s'assurer que le serveur local est lancé sur le port 3000
test.describe('Contrôle d\'accès basé sur les rôles (RBAC)', () => {

  test('Un client est redirigé s\'il tente d\'accéder au dashboard pro', async ({ page }) => {
    // Naviguer vers la page de login
    await page.goto('http://localhost:3000/login');
    
    // Remplir les informations d'un client
    await page.fill('input[type="email"]', 'client@monservice.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers /client/dashboard
    await page.waitForURL('**/client/dashboard');
    expect(page.url()).toContain('/client/dashboard');

    // Tenter d'accéder au CRM professionnel
    await page.goto('http://localhost:3000/dashboard');
    
    // Le middleware devrait le bloquer et le renvoyer vers /forbidden (ou /client/dashboard)
    await page.waitForURL('**/forbidden');
    expect(page.url()).toContain('/forbidden');

    // Tenter d'accéder à la liste des clients
    await page.goto('http://localhost:3000/clients');
    await page.waitForURL('**/forbidden');
    expect(page.url()).toContain('/forbidden');
  });

  test('Un professionnel (freelance) accède correctement à son dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Remplir les informations du freelance
    await page.fill('input[type="email"]', 'freelance@monservice.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers /dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Tenter d'accéder à l'espace client
    await page.goto('http://localhost:3000/client/dashboard');
    
    // Le middleware devrait le bloquer et le renvoyer vers /forbidden
    await page.waitForURL('**/forbidden');
    expect(page.url()).toContain('/forbidden');
  });

});
