import { test, expect } from '@playwright/test';

test.describe('Field Service Operations Journey E2E (Session 17)', () => {
  const proEmail = 'pro_a@monservice.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Login as professional
    await page.goto('/login');
    await page.fill('input[name="email"]', proEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));
  });

  test('FIELD_SERVICE_E2E_01: Complete Persistent Field Service Lifecycle (Desktop 1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const runId = Date.now();
    const uniqueTitle = `Chantier Rénovation #${runId}`;
    const uniqueSiteLabel = `Site Résidence #${runId}`;
    const uniqueReportSummary = `Rapport d'intervention validé #${runId}`;

    // 1. Check Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Navigate to Operations List
    await page.goto('/operations');
    await expect(page.locator('h1').first()).toBeVisible();

    // 3. Navigate to New Operation Form
    await page.goto('/operations/nouveau');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();

    // 4. Create New Site via Modal
    await page.click('[data-testid="new-site-button"]');
    await expect(page.locator('text=Ajouter un nouveau site')).toBeVisible();
    await page.fill('input[placeholder="Ex: Résidence Principale, Chantier Bat A..."]', uniqueSiteLabel);
    await page.fill('input[placeholder="12 rue des Artisans"]', '25 Avenue de la République');
    await page.fill('input[placeholder="75001"]', '75011');
    await page.fill('input[placeholder="Paris"]', 'Paris');
    await page.fill('textarea[placeholder="Digicode, étage, accès cour..."]', 'Bâtiment B, Code 4590');
    await page.click('button:has-text("Enregistrer le site")');

    // Wait for modal to close and site to be selected
    await expect(page.locator('text=Ajouter un nouveau site')).not.toBeVisible();
    await expect(page.locator('[data-testid="site-select"]')).toContainText(uniqueSiteLabel);

    // 5. Fill and Submit Work Order Form
    await page.fill('[data-testid="title-input"]', uniqueTitle);
    await page.selectOption('[data-testid="work-type-select"]', 'intervention');
    await page.selectOption('[data-testid="priority-select"]', 'high');
    await page.fill('[data-testid="scheduled-start-input"]', '2026-11-15T08:30');
    await page.fill('[data-testid="scheduled-end-input"]', '2026-11-15T17:00');
    await page.fill('[data-testid="description-input"]', 'Remplacement complet des canalisations principales et test de pression.');

    await page.click('[data-testid="submit-operation-button"]');

    // 6. Verify Redirection to Operation Detail & Persistent Data
    await page.waitForURL(/\/operations\/[0-9a-fA-F-]+/);
    await expect(page.locator('[data-testid="operation-detail"]')).toBeVisible();

    // Assert initial planned state & metadata
    await expect(page.locator('h1')).toContainText(uniqueTitle);
    await expect(page.locator('[data-testid="operation-reference"]')).toBeVisible();
    await expect(page.locator('[data-testid="operation-status-badge"]')).toContainText('Planifié');
    await expect(page.locator('text=' + uniqueSiteLabel)).toBeVisible();

    // 7. Assign a Worker
    await page.click('[data-testid="assign-worker-button"]');
    await expect(page.locator('text=Assigner un collaborateur')).toBeVisible();
    await page.click('button:has-text("Assigner")');
    await expect(page.locator('text=Assigner un collaborateur')).not.toBeVisible();

    // 8. Transition: Scheduled -> In Progress
    await page.click('[data-testid="start-operation-button"]');
    await expect(page.locator('[data-testid="operation-status-badge"]')).toContainText('En cours');

    // 9. Create Draft Report
    await page.click('[data-testid="create-report-button"]');
    await expect(page.locator('text=Nouveau compte-rendu')).toBeVisible();
    await page.fill('input[placeholder="Ex: Remplacement vanne générale effectué avec succès"]', uniqueReportSummary);
    await page.fill('textarea[placeholder="Détails des opérations techniques menées..."]', 'Travaux réalisés avec succès selon devis.');
    await page.fill('textarea[placeholder="Points de blocage, vétusté, imprévus..."]', 'Aucun blocage constaté.');
    await page.fill('textarea[placeholder="Préconisations d\'entretien futur, travaux à prévoir..."]', 'Contrôle annuel recommandé.');
    await page.click('button:has-text("Enregistrer le brouillon")');

    await expect(page.locator('text=Nouveau compte-rendu')).not.toBeVisible();
    await expect(page.locator('text=' + uniqueReportSummary)).toBeVisible();
    await expect(page.locator('text=Brouillon')).toBeVisible();

    // 10. Finalize Report
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('[data-testid="finalize-report-button"]');
    await expect(page.locator('text=Finalisé (Immuable)')).toBeVisible();

    // 11. Complete Work Order: In Progress -> Completed
    await page.click('[data-testid="complete-operation-button"]');
    await expect(page.locator('[data-testid="operation-status-badge"]')).toContainText('Terminé');

    // 12. Verify Timeline History entries
    const timeline = page.locator('[data-testid="timeline-list"]');
    await expect(timeline).toBeVisible();
    await expect(timeline).toContainText(/in_progress|completed/i);

    // 13. Reload Browser and Verify DB/UI Persistence
    await page.reload();
    await expect(page.locator('h1')).toContainText(uniqueTitle);
    await expect(page.locator('[data-testid="operation-status-badge"]')).toContainText('Terminé');
    await expect(page.locator('text=' + uniqueSiteLabel)).toBeVisible();
    await expect(page.locator('text=' + uniqueReportSummary)).toBeVisible();
    await expect(page.locator('text=Finalisé (Immuable)')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-list"]')).toContainText(/completed/i);
  });

  test('FIELD_SERVICE_E2E_02: Mobile Viewport Smoke (390x844) - Responsiveness & Access', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Check Dashboard on Mobile
    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Check Operations on Mobile
    await page.goto('/operations');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/Opérations|Interventions|Chantiers/i);

    // 3. Check New Operation on Mobile
    await page.goto('/operations/nouveau');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible();
  });
});
