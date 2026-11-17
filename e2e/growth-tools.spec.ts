import { test, expect } from '@playwright/test';

// Le panneau d'aide contextuelle s'ouvre par défaut en bas à droite et
// recouvre les boutons de formulaire alignés à droite (constaté en CI sur
// « Envoyer l'invitation ») : on le ferme comme le ferait l'utilisateur.
const closeContextualHelp = () => window.localStorage.setItem('monservice_contextual_help', 'off');
import postgres from 'postgres';
import { signInFixture } from './helpers/sign-in-fixture';

// Outils de croissance (0020) : règlement saisi sur une facture, demande
// d'avis, dépôt de l'avis sans compte, vitrine publique, trésorerie et export.
const adminEmail = 'pro_generic_a@monservice.invalid';
const orgA = 'org-generic-a-1234';
const invoiceId = 'growth-e2e-invoice';
const clientId = 'growth-e2e-client';
const slug = 'growth-e2e-entreprise-a';

test.describe('Croissance — règlement, avis vérifié, vitrine, trésorerie', () => {
  test.describe.configure({ mode: 'serial' });
  let sql: postgres.Sql;

  const cleanup = async () => {
    await sql`delete from client_reviews where invoice_id = ${invoiceId}`;
    await sql`delete from client_review_requests where invoice_id = ${invoiceId}`;
    await sql`delete from automation_deliveries where document_id = ${invoiceId}`;
    await sql`delete from organization_public_profiles where organization_id = ${orgA}`;
    await sql`update invoices set status = 'draft' where id = ${invoiceId}`;
    await sql`delete from invoices where id = ${invoiceId}`;
    await sql`delete from clients where id = ${clientId}`;
  };

  test.beforeAll(async () => {
    sql = postgres(process.env.NEON_ADMIN_DATABASE_URL ?? process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
    await cleanup();
    const now = new Date().toISOString();
    const issued = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
    const due = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    await sql`insert into clients (id, organization_id, name, email, contact_first_name, contact_last_name, created_at, updated_at)
      values (${clientId}, ${orgA}, 'Marie Martin', 'marie.growth.e2e@monservice.invalid', 'Marie', 'Martin', ${now}, ${now})`;
    await sql`insert into invoices (id, organization_id, client_id, type, number, date, due_date, status, total_ht, tax_amount, total_ttc, amount_due, created_at, updated_at)
      values (${invoiceId}, ${orgA}, ${clientId}, 'invoice', 'GROWTH-E2E-1', ${issued}, ${due}, 'sent', 500, 100, 600, 600, ${now}, ${now})`;
  });

  test.afterAll(async () => {
    await cleanup();
    await sql.end();
  });

  test('facture réglée, avis demandé puis publié, visible sur la vitrine', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(closeContextualHelp);
    const page = await context.newPage();
    await signInFixture(page, adminEmail, /\/dashboard/);

    // Trésorerie : la facture échue apparaît dans les retards.
    await page.goto('/facturation/tresorerie');
    await expect(page.getByTestId('treasury')).toContainText('GROWTH-E2E-1');

    // Règlement saisi à la main (virement).
    await page.goto(`/facturation/factures/${invoiceId}`);
    await expect(page.getByTestId('record-payment')).toBeVisible();
    await page.getByRole('button', { name: 'Marquer comme réglée' }).click();
    // D'abord la base (source de vérité), puis l'écran, rechargé en entier et
    // dont les données arrivent côté client : lent sur la CI distante.
    await expect.poll(async () => {
      const [row] = await sql`select status, payment_method from invoices where id = ${invoiceId}`;
      return `${row?.status}/${row?.payment_method}`;
    }, { timeout: 60_000 }).toBe('paid/transfer');
    await expect(page.getByTestId('invoice-paid')).toContainText('Virement', { timeout: 60_000 });

    // Demande d'avis : sans service d'e-mail en CI, le lien est affiché.
    await page.getByRole('button', { name: 'Demander un avis au client' }).click();
    const status = page.getByTestId('invoice-paid').getByRole('status');
    await expect(status).toContainText('/laisser-un-avis?token=');
    const link = (await status.textContent())!.match(/https?:\/\/\S+\/laisser-un-avis\?token=[A-Za-z0-9_-]{43}/)![0];

    // Vitrine publiée.
    await page.goto('/parametres/vitrine');
    await page.getByLabel('Adresse de la page').fill(slug);
    await page.getByLabel('Accroche').fill('Votre partenaire informatique');
    await page.getByLabel('Publier la vitrine').check();
    await page.getByRole('button', { name: 'Enregistrer' }).first().click();
    await expect(page.getByTestId('public-profile-editor').getByRole('status')).toContainText('Vitrine publiée');

    // Le client dépose son avis, sans compte.
    const visitorContext = await browser.newContext();
    await visitorContext.addInitScript(closeContextualHelp);
    const visitor = await visitorContext.newPage();
    const url = new URL(link);
    await visitor.goto(url.pathname + url.search);
    await expect(visitor.getByTestId('review-link')).toContainText('GROWTH-E2E-1');
    await expect(visitor.getByLabel('Nom affiché')).toHaveValue('Marie M.');
    await visitor.getByRole('button', { name: /5 étoiles/ }).click();
    await visitor.getByLabel('Votre commentaire (facultatif)').fill('Intervention rapide et soignée.');
    await visitor.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(visitor.getByTestId('review-thanks')).toBeVisible();

    // Le lien ne sert qu'une fois.
    await visitor.goto(url.pathname + url.search);
    await expect(visitor.getByTestId('review-link')).toContainText('Merci pour votre avis');

    // La vitrine publique affiche l'avis vérifié.
    await visitor.goto(`/pro/${slug}`);
    await expect(visitor.getByTestId('public-pro-name')).toHaveText('Entreprise Générique A');
    await expect(visitor.locator('#avis')).toContainText('Intervention rapide et soignée.');
    await expect(visitor.locator('#avis')).toContainText('Marie M.');
    await visitorContext.close();

    // Côté professionnel : réponse publique.
    await page.goto('/avis-clients');
    await expect(page.getByTestId('own-review')).toContainText('Intervention rapide');
    await page.getByRole('button', { name: 'Répondre' }).click();
    await page.getByPlaceholder(/Remerciez votre client/).fill('Merci Marie !');
    await page.getByRole('button', { name: 'Publier la réponse' }).click();
    await expect(page.getByTestId('own-review').getByRole('status')).toContainText('Réponse publiée');

    // Export comptable.
    await page.goto('/facturation/tresorerie');
    const exportResponse = await page.request.get(`/api/exports/ventes?from=2000-01-01&to=2100-12-31`);
    expect(exportResponse.status()).toBe(200);
    expect(await exportResponse.text()).toContain('GROWTH-E2E-1');
    await context.close();
  });

  test('sans session, l’export comptable est refusé', async ({ request }) => {
    expect((await request.get('/api/exports/ventes?from=2026-01-01&to=2026-12-31')).status()).toBe(401);
  });
});
