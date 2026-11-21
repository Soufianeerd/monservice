import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('pro_health_a@monservice.invalid');
  await page.locator('input[name="password"]').fill(process.env.E2E_AUTH_PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('header')).toContainText('Masseur-Kinésithérapeute');
}

test('Le français reste la langue source malgré un ancien cookie de langue', async ({ page, context }) => {
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'de', url: 'http://localhost:3039' }]);
  await signIn(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByText('Deutsch', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Ajouter un patient/ })).toBeVisible();
  await page.getByLabel('Réduire l’aide').click();
  await page.getByLabel('Activer le mode sombre').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.locator('header').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(30, 41, 59)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { name: "Aujourd'hui", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('cabinet-dark.png') });
  await page.getByLabel('Activer le mode clair').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('Le guide cible les contrôles, suit le défilement et change avec la page', async ({ page }) => {
  await signIn(page);
  await page.goto('/patients');
  await expect(page.getByLabel('Aide contextuelle')).toContainText('Retrouver vos patients');
  await page.getByRole('button', { name: 'Me montrer les éléments' }).click();
  const tour = page.getByRole('dialog', { name: 'Tutoriel de cette page' });
  await expect(tour).toContainText('Ajouter un patient');
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(tour).toContainText('Nom (naissance / usage)');
  await page.locator('main').evaluate(element => { element.scrollTop += 150; });
  await expect(tour).toBeVisible();
  await page.goto('/agenda/disponibilites');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Aide contextuelle')).toContainText('Quand pouvez-vous recevoir des patients');
  await page.getByLabel('Réduire l’aide').click();
  await page.getByLabel('Comprendre cette page').click();
  await expect(page.getByLabel('Aide contextuelle')).toBeVisible();
});

test('Le profil enregistre réellement le nom et utilise un parcours de mot de passe séparé', async ({ page }) => {
  await signIn(page); await page.goto('/parametres/profil');
  await page.getByLabel('Réduire l’aide').click();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByLabel('Adresse e-mail de connexion')).toHaveAttribute('readonly', '');
  const original = await page.getByLabel('Nom complet').inputValue();
  try {
    await page.getByLabel('Nom complet').fill('Praticien UX synthétique');
    await page.getByRole('button', { name: 'Enregistrer mon nom' }).click();
    await expect(page.getByRole('status')).toContainText('Votre nom a été enregistré');
    await page.reload();
    await expect(page.getByLabel('Nom complet')).toHaveValue('Praticien UX synthétique');
    await expect(page.getByRole('button', { name: 'Recevoir le lien sécurisé' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Changer mon mot de passe' })).toBeVisible();
  } finally {
    await page.getByLabel('Nom complet').fill(original);
    await page.getByRole('button', { name: 'Enregistrer mon nom' }).click();
    await expect(page.getByRole('status')).toContainText('Votre nom a été enregistré');
  }
});

test('Le cabinet sépare les coordonnées, le planning, les prestations et l’abonnement', async ({ page }) => {
  await signIn(page); await page.getByLabel('Réduire l’aide').click();
  await page.goto('/parametres/organisation');
  await expect(page.getByRole('button', { name: /CONNECTER MON COMPTE STRIPE/i })).toHaveCount(0);
  await expect(page.locator('input[id="website"]')).toHaveCount(0);
  await page.goto('/facturation/produits');
  await expect(page.getByRole('heading', { name: 'Factures patients' })).toBeVisible();
  await expect(page.getByRole('link', { name: '+ Nouvelle prestation', exact: true })).toBeVisible();
  await page.goto('/agenda/disponibilites');
  await expect(page.getByLabel('Praticien', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Lieu de consultation', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Ajouter des horaires', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '+ Ajouter des horaires', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.goto('/parametres/facturation');
  await expect(page.getByRole('heading', { name: 'Abonnement MonService' })).toBeVisible();
  await expect(page.getByText('Vous n’avez aucun compte Stripe à créer ou à connecter.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gérer mon abonnement sur Stripe' })).toHaveCount(0);
});

test('La navigation et les filtres patients restent utilisables sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page); await page.getByLabel('Réduire l’aide').click();
  await page.getByLabel('Ouvrir le menu').click();
  await page.getByRole('link', { name: 'Patients', exact: true }).click();
  await expect(page).toHaveURL(/\/patients$/);
  await expect(page.getByLabel('Nom (naissance / usage)', { exact: true })).toBeVisible();
  await page.getByLabel('Statut', { exact: true }).selectOption('archived');
  await expect(page.getByLabel('Statut', { exact: true })).toHaveValue('archived');
  await expect(page.getByRole('button', { name: 'Rechercher', exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('patients-mobile.png') });
  for (const width of [917, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/agenda/disponibilites');
    await expect(page.getByRole('button', { name: '+ Ajouter des horaires', exact: true })).toBeEnabled();
    await expect.poll(() => page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});

test('Les professions ne débordent pas lors de l’inscription, sur desktop et mobile', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill('Test UX');
  await page.locator('input[name="email"]').fill('registration-ux@monservice.invalid');
  await page.locator('input[name="password"]').fill('Synthetic!Password2026');
  await page.locator('input[name="confirmPassword"]').fill('Synthetic!Password2026');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: /Je suis un professionnel/ }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Santé & Bien-être', exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const profession = page.getByRole('button', { name: 'Kinésithérapeute', exact: true });
    await profession.scrollIntoViewIfNeeded();
    await expect(profession).toBeVisible();
    expect(await profession.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await profession.click(); await expect(profession).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  // Aucun compte créé : le test vérifie le choix de profession et s'arrête avant l'envoi.
});
