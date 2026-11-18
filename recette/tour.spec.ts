import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { FIELD_SERVICE_PROFESSION_CODES, FIELD_SERVICE_PROFESSIONS } from '../src/lib/workspaces/field-service/professions';
import { PARAMEDICAL_PROFESSION_CODES } from '../src/lib/workspaces/paramedical/professions';

/**
 * Recette visuelle : crée un vrai compte par métier ouvert à l'inscription,
 * parcourt chaque page du menu, capture l'écran et consigne toute anomalie.
 * Données 100 % synthétiques, sur une branche Neon jetable.
 */

const OUT = path.resolve('recette-output');
const SHOTS = path.join(OUT, 'captures');
fs.mkdirSync(SHOTS, { recursive: true });
const RESULTS = path.join(OUT, 'results.jsonl');
const password = `Recette-${Date.now()}-Aa1!`;

type PageCheck = {
  account: string; sector: string; profession: string | null; url: string; status: number | null;
  title: string; problems: string[]; screenshot: string | null;
};

function record(entry: unknown) {
  fs.appendFileSync(RESULTS, JSON.stringify(entry) + '\n');
}

function slug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function collectNavigation(page: Page): Promise<string[]> {
  await page.waitForSelector('nav a[href^="/"]', { timeout: 45_000 });
  // Déplie chaque rubrique qui a des sous-rubriques (le chevron ne navigue pas).
  await page.evaluate(() => {
    for (const link of Array.from(document.querySelectorAll('nav a'))) {
      if (link.querySelector(':scope > svg')) (link as HTMLElement).click();
    }
  });
  await page.waitForTimeout(500);
  const hrefs = await page.$$eval('nav a[href^="/"]', (links) => links.map((link) => link.getAttribute('href') ?? ''));
  return Array.from(new Set(hrefs.filter((href) => href && href !== '/' && !href.startsWith('/api'))));
}

async function visit(page: Page, account: string, sector: string, profession: string | null, url: string, capture: boolean): Promise<PageCheck> {
  const problems: string[] = [];
  const onError = (error: Error) => problems.push(`Erreur JavaScript : ${error.message.slice(0, 200)}`);
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error' && !/favicon|Download the React DevTools/i.test(message.text())) problems.push(`Console : ${message.text().slice(0, 200)}`);
  };
  const onResponse = (response: { status(): number; url(): string }) => {
    const target = new URL(response.url());
    if (response.status() >= 500 && target.origin === new URL(page.url() || 'http://localhost:3039').origin) problems.push(`HTTP ${response.status()} sur ${target.pathname}`);
  };
  page.on('pageerror', onError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  let status: number | null = null;
  let screenshot: string | null = null;
  let title = '';
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    status = response?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => problems.push('Page encore en chargement après 20 s'));
    const body = await page.locator('body').innerText().catch(() => '');
    if (/Une erreur est survenue/.test(body)) problems.push('Écran « Une erreur est survenue »');
    if (/Page introuvable/.test(body)) problems.push('Écran « Page introuvable »');
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(body)) problems.push('Texte technique affiché (undefined / NaN / [object Object])');
    if (!new URL(page.url()).pathname.startsWith(new URL(url, 'http://x').pathname)) problems.push(`Redirigé vers ${new URL(page.url()).pathname}`);
    if (status && status >= 400) problems.push(`HTTP ${status}`);
    title = (await page.locator('h1').first().innerText({ timeout: 2_000 }).catch(() => '')).trim();
    if (capture) {
      screenshot = `captures/${slug(account)}__${slug(url) || 'accueil'}.png`;
      await page.screenshot({ path: path.join(OUT, screenshot), fullPage: true });
    }
  } catch (error) {
    problems.push(`Échec du chargement : ${(error as Error).message.split('\n')[0].slice(0, 200)}`);
  } finally {
    page.off('pageerror', onError);
    page.off('console', onConsole);
    page.off('response', onResponse);
  }
  const check = { account, sector, profession, url, status, title, problems: Array.from(new Set(problems)), screenshot };
  record({ kind: 'page', ...check });
  return check;
}

async function register(page: Page, email: string, orgName: string, sectorLabel: string, professionLabel: string | null) {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill(`Recette ${orgName}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: /Je suis un professionnel/ }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.locator('input[name="orgName"]').fill(orgName);
  await page.getByRole('button', { name: sectorLabel, exact: true }).click();
  if (professionLabel) await page.getByRole('button', { name: new RegExp(`^${professionLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Valider mon inscription' }).click();
  await page.waitForURL((target) => !target.pathname.startsWith('/register'), { timeout: 60_000 });
}

async function signIn(page: Page, email: string, secret: string) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(secret);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
}

async function tour(page: Page, account: string, sector: string, profession: string | null, fullCapture: boolean) {
  await page.goto('/dashboard');
  const links = await collectNavigation(page);
  record({ kind: 'navigation', account, sector, profession, links });
  const pages = ['/dashboard', ...links.filter((href) => href !== '/dashboard')];
  for (const url of pages) await visit(page, account, sector, profession, url, fullCapture || url === '/dashboard');
}

type Candidate = { sectorLabel: string; sector: string; profession: string | null; professionLabel: string | null; full: boolean };

const fieldFamiliesSeen = new Set<string>();
const candidates: Candidate[] = [
  { sector: 'freelance', sectorLabel: 'Consultant & Services professionnels', profession: null, professionLabel: null, full: true },
  { sector: 'other', sectorLabel: 'Autre', profession: null, professionLabel: null, full: true },
  ...FIELD_SERVICE_PROFESSION_CODES.map((code) => {
    const definition = FIELD_SERVICE_PROFESSIONS[code];
    const family = String(definition.family);
    const full = !fieldFamiliesSeen.has(family);
    fieldFamiliesSeen.add(family);
    return { sector: 'field_services', sectorLabel: 'BTP, Artisanat & Services techniques', profession: code, professionLabel: definition.shortLabel || definition.label, full };
  }),
];

test.describe.configure({ mode: 'serial' });

test('le secteur santé reste fermé à l’inscription (V1)', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill('Recette santé');
  await page.locator('input[name="email"]').fill(`recette-sante-${Date.now()}@monservice.invalid`);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  const particulier = await page.getByRole('button', { name: /Je suis un particulier/ }).count();
  record({ kind: 'rule', rule: 'Aucun compte particulier proposé à l’inscription (V1)', passed: particulier === 0 });
  await page.getByRole('button', { name: /Je suis un professionnel/ }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  const health = await page.getByRole('button', { name: 'Santé & Bien-être', exact: true }).count();
  record({ kind: 'rule', rule: 'Secteur santé fermé à l’inscription (V1)', passed: health === 0 });
  await page.screenshot({ path: path.join(SHOTS, '00-inscription-secteurs.png'), fullPage: true });
  record({ kind: 'page', account: 'Inscription', sector: '-', profession: null, url: '/register (étape Activité)', status: 200, title: 'Choix du secteur', problems: [], screenshot: 'captures/00-inscription-secteurs.png' });
  expect(particulier).toBe(0);
  expect(health).toBe(0);
});

test('pages publiques', async ({ page }) => {
  for (const url of ['/', '/login', '/register', '/conditions', '/confidentialite', '/mentions-legales', '/cookies']) {
    await visit(page, 'Visiteur', 'public', null, url, true);
  }
});

for (const candidate of candidates) {
  const label = candidate.profession ?? candidate.sector;
  test(`inscription et parcours : ${label}`, async ({ page }) => {
    const email = `recette-${slug(label)}-${Date.now()}@monservice.invalid`;
    const orgName = `Recette ${candidate.professionLabel ?? candidate.sectorLabel}`;
    let created = false;
    try {
      await register(page, email, orgName, candidate.sectorLabel, candidate.professionLabel);
      created = true;
      const landed = new URL(page.url()).pathname;
      record({ kind: 'signup', account: orgName, sector: candidate.sector, profession: candidate.profession, landed, passed: landed.startsWith('/dashboard') });
      if (!landed.startsWith('/dashboard')) await signIn(page, email, password);
      await tour(page, orgName, candidate.sector, candidate.profession, candidate.full);
    } catch (error) {
      record({ kind: 'signup', account: orgName, sector: candidate.sector, profession: candidate.profession, landed: page.url(), passed: false, created, error: (error as Error).message.split('\n')[0].slice(0, 300) });
      await page.screenshot({ path: path.join(SHOTS, `echec-${slug(label)}.png`), fullPage: true }).catch(() => undefined);
      throw error;
    }
  });
}

// Comptes déjà remplis par les données de démonstration (lecture seule du parcours).
const seeded = [
  { email: 'pro_fs_a@monservice.invalid', account: 'Démo — Plomberie (avec données)', sector: 'field_services', profession: 'plumber' },
  { email: 'pro_generic_a@monservice.invalid', account: 'Démo — Entreprise générique (avec données)', sector: 'IT', profession: null },
  { email: 'pro_health_a@monservice.invalid', account: 'Démo — Kinésithérapeute (existant, V1 gelée)', sector: 'health', profession: 'physiotherapist' },
  { email: 'pro_b@monservice.invalid', account: 'Démo — Ostéopathe (existant, V1 gelée)', sector: 'health', profession: 'osteopath' },
];
for (const account of seeded) {
  test(`parcours démo : ${account.account}`, async ({ page }) => {
    await signIn(page, account.email, process.env.E2E_AUTH_PASSWORD!);
    await tour(page, account.account, account.sector, account.profession, true);
  });
}

test('métiers santé non testables en V1', async () => {
  record({ kind: 'note', note: `Métiers paramédicaux fermés à l’inscription en V1 : ${PARAMEDICAL_PROFESSION_CODES.length}. Seuls les deux cabinets existants (kiné, ostéo) sont parcourus.` });
});
