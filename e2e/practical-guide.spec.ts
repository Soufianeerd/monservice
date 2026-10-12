import { expect, test, type Page } from '@playwright/test';
import { signInFixture } from './helpers/sign-in-fixture';

async function signIn(page: Page, email: string) {
  await signInFixture(page, email, /\/dashboard$/);
  await expect(page.getByLabel('Comprendre cette page')).toBeVisible();
}
const tour = (page: Page) => page.getByRole('dialog', { name: 'Tutoriel de cette page' });
async function choose(page: Page, label: string) {
  await page.getByLabel('Comprendre cette page').click();
  const panel = page.getByLabel('Aide contextuelle');
  const button = panel.getByRole('button', { name: label, exact: true });
  if (!(await button.isVisible())) await panel.getByText('Tous les parcours de prise en main', { exact: true }).click();
  await button.click();
  await expect(tour(page)).toContainText(label);
}
async function throughFields(page: Page, lastTitle: string) {
  // Chaque étape reste liée à un contrôle réel ; aucun clic métier automatique du guide.
  for (let step = 0; step < 60; step++) {
    if (await tour(page).getByRole('heading', { name: lastTitle, exact: true }).isVisible()) return;
    await tour(page).getByRole('button', { name: 'Suivant', exact: true }).click();
  }
  throw new Error(`Le guide n’a pas atteint ${lastTitle}`);
}

test('Le tutoriel patient suit les champs jusqu’à une création réellement persistée', async ({ page }) => {
  await signIn(page, 'pro_a@monservice.invalid');
  const name = `PATIENT TUTORIEL ${Date.now()}`;
  await choose(page, 'Ajouter un patient, champ par champ');
  await expect(page).toHaveURL(/\/patients\/new$/);
  await expect(tour(page).getByRole('heading', { name: 'Nom de naissance *', exact: true })).toBeVisible();
  await page.locator('#patient-birth-name').fill(name);
  await tour(page).getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(tour(page)).toContainText('Premier prénom de naissance');
  await page.locator('#patient-first-birth-name').fill('Martin');
  await page.screenshot({ path: test.info().outputPath('guide-patient-champs.png') });
  await page.locator('#patient-birth-date').fill('1990-01-01');
  await throughFields(page, 'Créer le patient');
  await page.getByRole('button', { name: 'Créer le patient', exact: true }).click();
  await expect(tour(page)).toContainText('Enregistrement confirmé');
  await expect(page).toHaveURL(/\/patients\/[^/]+$/);
  await expect(page.locator('main h1')).toContainText(name);
  await page.reload();
  await expect(page.locator('main h1')).toContainText(name);
});

test('Le devis du cabinet sélectionne un patient et conserve une TVA à zéro après sauvegarde', async ({ page }) => {
  await signIn(page, 'pro_a@monservice.invalid');
  await choose(page, 'Créer un devis, ligne par ligne');
  await expect(page).toHaveURL(/\/facturation\/devis\/nouveau$/);
  await expect(tour(page)).toContainText('Rechercher un patient');
  const patients = page.getByTestId('quote-client-select');
  await expect(patients.locator('option')).not.toHaveCount(1);
  await patients.selectOption({ index: 1 });
  await page.getByTestId('quote-title-input').fill('DEVIS TUTORIEL FICTIF');
  await page.getByTestId('line-description-input').fill('PRESTATION TEST');
  await page.getByTestId('line-price-input').fill('50');
  // Le mode avancé rend le taux explicite, y compris pour le paramédical.
  await page.getByRole('checkbox', { name: /Détails des tarifs/i }).check();
  await page.getByTestId('line-tax-select').selectOption('0');
  await page.getByRole('button', { name: 'Créer le devis', exact: true }).click();
  await expect(tour(page)).toContainText('Enregistrement confirmé');
  await expect(page).toHaveURL(/\/facturation\/devis\/[^/]+$/);
  await page.reload();
  await expect(page.locator('main')).toContainText('DEVIS TUTORIEL FICTIF');
  await expect(page.locator('main')).toContainText('50');
  await expect(page.locator('main')).not.toContainText('60,00');
});

test('La facture du cabinet propose des patients et enregistre les lignes du catalogue', async ({ page }) => {
  await signIn(page, 'pro_a@monservice.invalid');
  await choose(page, 'Créer une facture pour un patient');
  await expect(page).toHaveURL(/\/facturation\/factures\/new$/);
  await expect(page.getByRole('heading', { name: 'Nouvelle facture patient', exact: true })).toBeVisible();
  const patients = page.locator('select[name="clientId"]');
  await expect(patients.locator('option')).not.toHaveCount(1);
  await patients.selectOption({ index: 1 });
  await page.locator('input[name="lines.0.description"]').fill('FACTURE TUTORIEL FICTIF');
  await page.locator('input[name="lines.0.unitPrice"]').fill('50');
  await page.locator('input[name="lines.0.taxRate"]').fill('0');
  await throughFields(page, 'Enregistrer la facture');
  await page.getByRole('button', { name: 'Enregistrer la facture', exact: true }).click();
  await expect(tour(page)).toContainText('Enregistrement confirmé');
  await expect(page).toHaveURL(/\/facturation\/factures\/[^/]+$/);
  await page.reload();
  await expect(page.locator('main')).toContainText('FACTURE TUTORIEL FICTIF');
});

test('Le guide accompagne un rendez-vous réel pour un patient fictif', async ({ page }) => {
  await signIn(page, 'pro_a@monservice.invalid');
  const name = `RDV TUTORIEL ${Date.now()}`;
  await choose(page, 'Ajouter un patient, champ par champ');
  await page.locator('#patient-birth-name').fill(name);
  await page.locator('#patient-first-birth-name').fill('Martin');
  await page.locator('#patient-birth-date').fill('1990-01-01');
  await page.getByRole('button', { name: 'Créer le patient', exact: true }).click();
  await expect(tour(page)).toContainText('Enregistrement confirmé');
  await choose(page, 'Planifier un rendez-vous');
  await expect(page).toHaveURL(/\/agenda\/calendrier$/);
  const controls = page.locator('[data-tour="calendar-controls"]');
  await controls.getByRole('button', { name: 'Suivant', exact: true }).click();
  await page.locator('[data-tour="new-appointment"]').click();
  await expect(tour(page).getByRole('heading', { name: 'Patient *', exact: true })).toBeVisible();
  const form = page.locator('form[data-guide-form="rendez-vous"]');
  await form.locator('input[placeholder="Rechercher par nom ou prénom..."]').fill(name);
  await form.getByRole('button').filter({ hasText: name }).click();
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
  await form.locator('input[type="date"]').fill(date.toISOString().slice(0, 10));
  await form.locator('input[type="time"]').fill('10:00');
  await throughFields(page, 'Confirmer le rendez-vous');
  await page.screenshot({ path: test.info().outputPath('guide-rendez-vous.png') });
  await form.getByRole('button', { name: 'Confirmer le rendez-vous', exact: true }).click();
  await expect(tour(page)).toContainText('Enregistrement confirmé');
  await expect(page.locator('main')).toContainText(name);
  // La vue de calendrier n’est pas persistée ; retrouver la semaine après rechargement.
  await page.reload();
  await page.locator('[data-tour="calendar-controls"]').getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.locator('main')).toContainText(name);
});

for (const [email, label] of [['pro_generic_a@monservice.invalid', 'tertiaire'], ['pro_fs_a@monservice.invalid', 'BTP']] as const) {
  test(`Le guide ${label} suit une prestation et son tarif jusqu’à l’enregistrement`, async ({ page }) => {
    await signIn(page, email);
    const name = `PRESTATION TUTORIEL ${label} ${Date.now()}`;
    await choose(page, 'Créer une prestation et son tarif');
    await expect(page).toHaveURL(/\/facturation\/produits\/new$/);
    await expect(tour(page)).toContainText('Nom du produit ou service');
    await page.locator('input[name="name"]').fill(name);
    await page.locator('textarea[name="description"]').fill('Exemple fictif pour la prise en main');
    await page.locator('input[name="unitPrice"]').fill('50');
    await page.locator('input[name="taxRate"]').fill('0');
    await throughFields(page, 'Sauvegarder');
    await page.getByRole('button', { name: 'Sauvegarder', exact: true }).click();
    await expect(tour(page)).toContainText('Enregistrement confirmé');
    await expect(page).toHaveURL(/\/facturation\/produits$/);
    await page.reload();
    await expect(page.locator('main')).toContainText(name);
  });
}

test('Le parcours BTP accompagne aussi la fenêtre de création d’un site', async ({ page }) => {
  await signIn(page, 'pro_fs_a@monservice.invalid');
  await choose(page, 'Créer et planifier une intervention');
  await expect(page).toHaveURL(/\/operations\/nouveau$/);
  await expect(tour(page)).toContainText('Client');
  await page.getByTestId('client-select').selectOption({ index: 1 });
  await page.getByTestId('new-site-button').click();
  await expect(tour(page)).toContainText('Nom');
  await page.locator('input[placeholder="Ex: Résidence Principale, Chantier Bat A..."]').fill('SITE TUTORIEL FICTIF');
  await expect(tour(page)).not.toContainText('Enregistrement confirmé');
  await page.screenshot({ path: test.info().outputPath('guide-site-btp.png') });
  await page.locator('input[placeholder="12 rue des Artisans"]').fill('1 rue du Test');
  await page.locator('input[placeholder="75001"]').fill('75001');
  await page.locator('input[placeholder="Paris"]').fill('Paris');
  await page.getByRole('button', { name: 'Enregistrer le site', exact: true }).click();
  await expect(tour(page)).toContainText('Le site est enregistré');
  await tour(page).getByRole('button', { name: 'Reprendre le formulaire' }).click();
  await expect(page.getByTestId('site-select')).toContainText('SITE TUTORIEL FICTIF');
  await expect(tour(page)).not.toContainText('Enregistrement confirmé');
});
