import fs from 'node:fs';
import path from 'node:path';
import { test, type Page } from '@playwright/test';

/**
 * Recette par univers : un vrai compte professionnel par univers (généraliste,
 * artisan, paramédical), puis le cycle métier complet, étape par étape, avec
 * une capture à chaque étape. Une étape qui échoue est consignée et la suite
 * continue, pour que le rapport montre tout ce qui marche et tout ce qui casse.
 * Données fictives, branche Neon jetable, réglages de production V1.
 */

const OUT = path.resolve('recette-output');
const SHOTS = path.join(OUT, 'captures');
fs.mkdirSync(SHOTS, { recursive: true });
const RESULTS = path.join(OUT, 'results.jsonl');
const password = `Recette-${Date.now()}-Aa1!`;
const run = Date.now();

function record(entry: unknown) {
  fs.appendFileSync(RESULTS, JSON.stringify(entry) + '\n');
}

function slug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function nextWeekday(): string {
  const day = new Date(Date.now() + 2 * 86_400_000);
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

type Universe = { key: string; title: string; sectorLabel: string; professionLabel: string | null; health: boolean };

let order = 0;
async function step(page: Page, universe: Universe, name: string, action: () => Promise<void>) {
  order += 1;
  const problems: string[] = [];
  const onError = (error: Error) => problems.push(`Erreur JavaScript : ${error.message.slice(0, 160)}`);
  page.on('pageerror', onError);
  let passed = true;
  let error = '';
  try {
    await action();
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    const body = await page.locator('body').innerText().catch(() => '');
    if (/Une erreur est survenue/.test(body)) problems.push('Écran « Une erreur est survenue »');
    if (/Page introuvable/.test(body)) problems.push('Écran « Page introuvable »');
    if (/\d[.,]\d{3}\s?k€/.test(body)) problems.push('Axe du graphique illisible');
  } catch (caught) {
    passed = false;
    error = (caught as Error).message.split('\n')[0].slice(0, 240);
  } finally {
    page.off('pageerror', onError);
  }
  const screenshot = `captures/${String(order).padStart(3, '0')}-${universe.key}-${slug(name)}.png`;
  await page.screenshot({ path: path.join(OUT, screenshot), fullPage: true }).catch(() => undefined);
  record({ kind: 'step', universe: universe.title, step: name, passed, error, problems, url: new URL(page.url()).pathname, screenshot });
  return passed;
}

async function register(page: Page, universe: Universe, email: string, orgName: string) {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill(`Camille ${universe.title}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.locator('input[name="orgName"]').fill(orgName);
  await page.locator('input[name="city"]').fill('Metz');
  await page.getByRole('button', { name: universe.sectorLabel, exact: true }).click();
  if (universe.professionLabel) await page.getByRole('button', { name: new RegExp(`^${universe.professionLabel}`) }).first().click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Créer mon espace' }).click();
  await page.waitForURL((target) => !target.pathname.startsWith('/register'), { timeout: 60_000 });
  if (!new URL(page.url()).pathname.startsWith('/dashboard')) {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  }
}

async function fillOrganisation(page: Page) {
  await page.goto('/parametres/organisation');
  await page.locator('#email').fill('contact@exemple-recette.fr');
  await page.locator('#phone').fill('03 87 00 00 00');
  await page.locator('#address').fill('12 rue de la Recette');
  await page.locator('#zipCode').fill('57000');
  await page.locator('#city').fill('Metz');
  await page.locator('#legalForm').selectOption('Entrepreneur individuel (micro-entreprise)');
  await page.locator('#siret').fill('123 456 789 00012');
  await page.locator('#vatExempt').check();
  await page.locator('#iban').fill('FR76 3000 6000 0112 3456 7890 189');
  await page.locator('#bic').fill('AGRIFRPP');
  await page.getByRole('button', { name: 'Enregistrer les coordonnées' }).click();
  await page.getByText(/enregistr/i).first().waitFor({ timeout: 20_000 });
}

async function createClient(page: Page, name: string) {
  await page.goto('/clients/new');
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(`${slug(name)}@exemple-client.fr`);
  await page.locator('#address').fill('8 place d’Armes');
  await page.locator('#zipCode').fill('57000');
  await page.locator('#city').fill('Metz');
  await page.locator('#contactFirstName').fill('Marie');
  await page.locator('#contactLastName').fill('Martin');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((target) => /\/clients\/[^/]+$/.test(target.pathname) && !target.pathname.endsWith('/new'), { timeout: 60_000 });
}

async function createPatient(page: Page) {
  await page.goto('/patients/new');
  await page.locator('#patient-birth-name').fill('MARTIN');
  await page.locator('#patient-first-birth-name').fill('Marie');
  await page.locator('#patient-birth-date').fill('1985-04-12');
  await page.locator('#patient-sex').selectOption('female');
  await page.locator('#patient-email').fill('marie.martin@exemple-patient.fr').catch(() => undefined);
  await page.getByRole('button', { name: /^Créer le/ }).click();
  await page.waitForURL((target) => /\/patients\/[^/]+$/.test(target.pathname) && !target.pathname.endsWith('/new'), { timeout: 60_000 });
}

async function createQuote(page: Page, title: string, line: string) {
  await page.goto('/facturation/devis/nouveau');
  const recipient = page.locator('[data-testid="quote-client-select"]');
  await recipient.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const select = document.querySelector('[data-testid="quote-client-select"]') as HTMLSelectElement | null;
    return Boolean(select && select.options.length > 1);
  }, undefined, { timeout: 30_000 });
  await recipient.selectOption({ index: 1 });
  await page.waitForTimeout(500);
  await page.locator('[data-testid="quote-title-input"]').fill(title);
  if (!(await page.locator('[data-testid="line-description-input"]').first().isVisible().catch(() => false))) {
    await page.locator('[data-testid="add-section-button"]').click();
  }
  await page.locator('[data-testid="line-description-input"]').first().fill(line);
  await page.locator('[data-testid="line-quantity-input"]').first().fill('2');
  await page.locator('[data-testid="line-price-input"]').first().fill('150');
  await page.locator('[data-testid="save-quote-button"]').click();
  await page.waitForURL(/\/facturation\/devis\/[0-9a-fA-F-]{36}/, { timeout: 60_000 });
}

async function sendAndAccept(page: Page) {
  await page.locator('[data-testid="send-quote-button"]').click();
  await page.locator('[data-testid="quote-status-badge"]').filter({ hasText: /Envoy/i }).waitFor({ timeout: 30_000 });
  await page.locator('[data-testid="quote-decision-method"]').selectOption('signed_document');
  await page.locator('[data-testid="record-quote-accepted-button"]').click();
  await page.locator('[data-testid="quote-status-badge"]').filter({ hasText: /Accept/i }).waitFor({ timeout: 30_000 });
}

async function createInvoice(page: Page) {
  await page.locator('[data-testid="create-final-invoice-button"]').click();
  await page.waitForURL(/\/facturation\/factures\/[0-9a-fA-F-]{36}/, { timeout: 60_000 });
}

async function recordPayment(page: Page) {
  const panel = page.locator('[data-testid="record-payment"]');
  await panel.waitFor({ timeout: 30_000 });
  await panel.getByRole('button', { name: 'Marquer comme réglée' }).click();
  await page.locator('[data-testid="invoice-paid"]').waitFor({ timeout: 60_000 });
}

async function tourMenu(page: Page, universe: Universe) {
  await page.goto('/dashboard');
  await page.waitForSelector('nav a[href^="/"]', { timeout: 45_000 });
  await page.evaluate(() => {
    for (const link of Array.from(document.querySelectorAll('nav a'))) if (link.querySelector(':scope > svg')) (link as HTMLElement).click();
  });
  await page.waitForTimeout(400);
  const hrefs = await page.$$eval('nav a[href^="/"]', (all) => all.map((link) => link.getAttribute('href') ?? ''));
  const links = Array.from(new Set(hrefs.filter(Boolean)));
  record({ kind: 'navigation', universe: universe.title, links });
  record({ kind: 'rule', universe: universe.title, rule: 'Pas de Marketplace ni de Messagerie en V1', passed: !links.some((href) => href.startsWith('/marketplace') || href.startsWith('/messages')) });
  for (const href of links) {
    await step(page, universe, `Page ${href}`, async () => {
      const response = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      if ((response?.status() ?? 200) >= 400) throw new Error(`HTTP ${response?.status()}`);
      if (!new URL(page.url()).pathname.startsWith(href)) throw new Error(`Redirigé vers ${new URL(page.url()).pathname}`);
    });
  }
}

const universes: Universe[] = [
  { key: 'generaliste', title: 'Généraliste (consultant)', sectorLabel: 'Consultant & Services professionnels', professionLabel: null, health: false },
  { key: 'artisan', title: 'Artisan (plombier)', sectorLabel: 'BTP, Artisanat & Services techniques', professionLabel: 'Plombier', health: false },
  { key: 'paramedical', title: 'Paramédical (kinésithérapeute)', sectorLabel: 'Santé & Bien-être', professionLabel: 'Kinésithérapeute', health: true },
  { key: 'bien-etre', title: 'Bien-être (coach sportif)', sectorLabel: 'Santé & Bien-être', professionLabel: 'Coach', health: true },
];

test.describe.configure({ mode: 'serial' });

test('règles V1 à l’inscription : professionnels uniquement, trois secteurs ouverts', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill('Recette règles');
  await page.locator('input[name="email"]').fill(`recette-regles-${run}@monservice.invalid`);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  record({ kind: 'rule', universe: 'Inscription', rule: 'Aucun compte client ou patient proposé', passed: (await page.getByRole('button', { name: /Je suis un particulier/ }).count()) === 0 });
  for (const label of ['Santé & Bien-être', 'BTP, Artisanat & Services techniques', 'Consultant & Services professionnels']) {
    record({ kind: 'rule', universe: 'Inscription', rule: `Secteur ouvert : ${label}`, passed: (await page.getByRole('button', { name: label, exact: true }).count()) === 1 });
  }
  await page.screenshot({ path: path.join(SHOTS, '000-inscription-secteurs.png'), fullPage: true });
});

for (const universe of universes) {
  test(`cycle complet — ${universe.title}`, async ({ page }) => {
    test.setTimeout(900_000);
    const email = `recette-${universe.key}-${run}@monservice.invalid`;
    const orgName = `Recette ${universe.title}`;
    const created = await step(page, universe, '1. Création du compte professionnel', () => register(page, universe, email, orgName));
    if (!created) return;
    await step(page, universe, '2. Tableau de bord à l’arrivée', async () => { await page.goto('/dashboard'); });
    await step(page, universe, '3. Coordonnées de l’activité', () => fillOrganisation(page));
    if (universe.health) {
      await step(page, universe, '4. Nouveau patient', () => createPatient(page));
      await step(page, universe, '5. Réglages du cabinet (lieux, praticiens, séances)', async () => { await page.goto('/parametres/cabinet'); });
      await step(page, universe, '6. Agenda : rendez-vous réservé', async () => {
        await page.goto('/agenda/calendrier');
        await page.getByRole('button', { name: /Nouvelle séance/ }).click();
        await page.getByText('Planifier une nouvelle séance').waitFor({ timeout: 20_000 });
        await page.getByPlaceholder('Rechercher par nom ou prénom...').fill('MARTIN');
        await page.getByRole('button', { name: /MARTIN/ }).first().click();
        await page.locator('input[type="date"]').first().fill(nextWeekday());
        await page.locator('input[type="time"]').first().fill('10:00');
        await page.getByRole('button', { name: 'Confirmer le rendez-vous' }).click();
        await page.getByText('Planifier une nouvelle séance').waitFor({ state: 'hidden', timeout: 30_000 });
      });
    } else {
      await step(page, universe, '4. Nouveau client (prospect)', () => createClient(page, `Client ${universe.key} ${run}`));
      await step(page, universe, '5. Opportunités commerciales', async () => { await page.goto('/deals'); });
      if (universe.key === 'artisan') {
        await step(page, universe, '6. Nouveau chantier', async () => {
          await page.goto('/operations/nouveau');
          await page.locator('[data-testid="client-select"]').selectOption({ index: 1 });
          await page.click('[data-testid="new-site-button"]', { force: true });
          await page.fill('input[placeholder="Ex: Résidence Principale, Chantier Bat A..."]', `Maison Martin ${run}`);
          await page.fill('input[placeholder="12 rue des Artisans"]', '8 place d’Armes');
          await page.fill('input[placeholder="75001"]', '57000');
          await page.fill('input[placeholder="Paris"]', 'Metz');
          await page.click('button:has-text("Enregistrer le site")');
          await page.locator('text=Ajouter un nouveau site').waitFor({ state: 'hidden', timeout: 30_000 });
          await page.locator('[data-testid="title-input"]').fill(`Remplacement chauffe-eau ${run}`);
          await page.locator('[data-testid="scheduled-start-input"]').fill('2026-12-01T08:30');
          await page.locator('[data-testid="scheduled-end-input"]').fill('2026-12-01T12:00');
          await page.click('[data-testid="submit-operation-button"]', { force: true });
          await page.waitForURL(/\/operations\/[0-9a-fA-F-]{36}/, { timeout: 60_000 });
        });
      }
    }
    const line = universe.key === 'bien-etre' ? 'Séance de coaching' : universe.health ? 'Séance de kinésithérapie' : universe.key === 'artisan' ? 'Pose chauffe-eau 200 L' : 'Journée de conseil';
    const quoted = await step(page, universe, '7. Devis', () => createQuote(page, `Devis recette ${universe.key} ${run}`, line));
    const accepted = quoted && await step(page, universe, '8. Devis envoyé puis accepté', () => sendAndAccept(page));
    const invoiced = accepted && await step(page, universe, '9. Facture', () => createInvoice(page));
    if (invoiced) await step(page, universe, '10. Règlement enregistré', () => recordPayment(page));
    await step(page, universe, '11. Trésorerie', async () => { await page.goto('/facturation/tresorerie'); });
    await step(page, universe, '12. Vitrine publique (mise en valeur)', async () => {
      await page.goto('/parametres/vitrine');
      await page.getByLabel('Accroche').fill(`${universe.title} à Metz`);
      await page.getByLabel('Publier la vitrine').check();
      await page.getByRole('button', { name: /Enregistrer/ }).first().click();
      await page.getByText(/enregistr/i).first().waitFor({ timeout: 20_000 });
    });
    await tourMenu(page, universe);
  });
}
