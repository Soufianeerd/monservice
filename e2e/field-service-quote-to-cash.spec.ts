import { test, expect, Page } from '@playwright/test';
import postgres from 'postgres';

async function dismissSetupGuideIfPresent(page: Page) {
  try {
    const closeBtn = page.locator('button[aria-label="Réduire le guide"]');
    if (await closeBtn.isVisible({ timeout: 1000 })) {
      await closeBtn.click({ force: true });
    }
  } catch {
    // Popover not present
  }
}

test.describe('Field Service Quote-to-Cash & Lead-to-Cash E2E (Session 18 & 18B)', () => {
  const proEmail = 'pro_fs_a@monservice.com';
  const clientEmail = 'client_fs_a@monservice.com';
  const password = 'password123';

  test('QUOTE_TO_CASH_FULL_PERSISTENT: Complete Lead-to-Cash Lifecycle with DB verification', async ({ page, request }) => {
    test.setTimeout(180000);
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

    try {
      const runId = Date.now();
      const uniqueQuoteTitle = `Devis Rénovation Complète #${runId}`;

      // ==============================================================
      // 1. Pro Login
      // ==============================================================
      await page.goto('/login');
      await page.fill('input[name="email"]', proEmail);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      await dismissSetupGuideIfPresent(page);

      // ==============================================================
      // 2. Navigate to New Quote Form
      // ==============================================================
      await page.goto('/facturation/devis/nouveau');
      await dismissSetupGuideIfPresent(page);
      await expect(page.locator('h1').first()).toBeVisible();

      // Fill Quote Header: Client, Site, Deal, Title
      await page.selectOption('[data-testid="quote-client-select"]', { index: 1 });
      
      // Wait for sites to load
      await page.waitForTimeout(500);
      const siteSelect = page.locator('[data-testid="quote-site-select"]');
      if (await siteSelect.isVisible()) {
        const siteOptions = await siteSelect.locator('option').all();
        if (siteOptions.length > 1) {
          await siteSelect.selectOption({ index: 1 });
        }
      }

      const dealSelect = page.locator('[data-testid="quote-deal-select"]');
      if (await dealSelect.isVisible()) {
        const dealOptions = await dealSelect.locator('option').all();
        if (dealOptions.length > 1) {
          await dealSelect.selectOption({ index: 1 });
        }
      }

      await page.fill('[data-testid="quote-title-input"]', uniqueQuoteTitle);

      // ==============================================================
      // 3. Configure Lots, Multi-TVA, Decimal Qty, Discount, Deposit
      // ==============================================================
      // Add Lot 1
      await page.click('[data-testid="add-section-button"]');

      // Fill Line 1 in Lot 1: Decimal quantity (12.5), Unit meter, TVA 5.5%
      await page.locator('[data-testid="line-description-input"]').first().fill('Tuyauterie cuivre sanitaire DN20');
      await page.locator('[data-testid="line-quantity-input"]').first().fill('12.5');
      await page.locator('[data-testid="line-unit-select"]').first().selectOption('meter');
      await page.locator('[data-testid="line-price-input"]').first().fill('45.00');
      await page.locator('[data-testid="line-tax-select"]').first().selectOption('5.5');

      // Add Lot 2
      await page.click('[data-testid="add-section-button"]');

      // Line 2 in Lot 2: TVA 10%
      const lineDescriptions = page.locator('[data-testid="line-description-input"]');
      // Click add line to section 2 if only 1 line exists in section 2
      const addLineButtons = page.locator('[data-testid="add-line-to-section-button"]');
      const addLineBtnCount = await addLineButtons.count();
      if (addLineBtnCount >= 2) {
        await addLineButtons.nth(1).click();
      }

      // Configure Line 2: Qty 2, Price 150.00, TVA 10%
      await lineDescriptions.nth(1).fill('Pose et raccordement chauffe-eau 200L');
      await page.locator('[data-testid="line-quantity-input"]').nth(1).fill('2');
      await page.locator('[data-testid="line-price-input"]').nth(1).fill('150.00');
      await page.locator('[data-testid="line-tax-select"]').nth(1).selectOption('10');

      // Add Line 3 in Lot 2: Qty 5, Price 80.00, Remise 10%, TVA 20%
      if (addLineBtnCount >= 2) {
        await addLineButtons.nth(1).click();
      }
      await lineDescriptions.nth(2).fill('Vannes thermostatiques haute précision');
      await page.locator('[data-testid="line-quantity-input"]').nth(2).fill('5');
      await page.locator('[data-testid="line-price-input"]').nth(2).fill('80.00');
      await page.locator('[data-testid="line-discount-input"]').nth(2).fill('10');
      await page.locator('[data-testid="line-tax-select"]').nth(2).selectOption('20');

      // Configure Deposit: 30%
      await page.click('[data-testid="deposit-mode-percentage"]');
      await page.fill('[data-testid="deposit-rate-input"]', '30');

      // ==============================================================
      // 4. Save Quote & Verify in DB
      // ==============================================================
      await page.click('[data-testid="save-quote-button"]');
      await page.waitForURL(/\/facturation\/devis\/[0-9a-fA-F-]+/);
      await dismissSetupGuideIfPresent(page);

      const quoteUrl = page.url();
      const quoteIdMatch = quoteUrl.match(/\/facturation\/devis\/([0-9a-fA-F-]+)/);
      expect(quoteIdMatch).toBeTruthy();
      const quoteId = quoteIdMatch![1];

      // Direct DB Verification of Saved Quote
      const [savedQuote] = await sql`SELECT * FROM invoices WHERE id = ${quoteId} AND type = 'quote'`;
      expect(savedQuote).toBeDefined();
      expect(savedQuote.status).toBe('draft');
      expect(savedQuote.deposit_mode).toBe('percentage');
      expect(Number(savedQuote.deposit_rate)).toBe(30);
      expect(Number(savedQuote.deposit_amount)).toBeGreaterThan(0);
      expect(Number(savedQuote.total_ttc)).toBeGreaterThan(0);

      // Verify sections and lines in DB
      const sectionsInDb = await sql`SELECT * FROM invoice_sections WHERE invoice_id = ${quoteId} ORDER BY position ASC`;
      expect(sectionsInDb.length).toBeGreaterThanOrEqual(2);

      const linesInDb = await sql`SELECT * FROM invoice_lines WHERE invoice_id = ${quoteId}`;
      expect(linesInDb.length).toBeGreaterThanOrEqual(3);

      // ==============================================================
      // 5. Pro Sends Quote -> status = 'sent'
      // ==============================================================
      await page.click('[data-testid="send-quote-button"]');
      await expect(page.locator('[data-testid="quote-status-badge"]')).toContainText(/Envoyé/i);

      // Verify status 'sent' in DB
      const [sentQuote] = await sql`SELECT status FROM invoices WHERE id = ${quoteId}`;
      expect(sentQuote.status).toBe('sent');

      // ==============================================================
      // 6. Client Connects, Views Quote & Digitally Signs -> status = 'accepted'
      // ==============================================================
      await page.goto('/login');
      await page.fill('input[name="email"]', clientEmail);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/client/dashboard');

      // Open Client Quote Page
      await page.goto(`/client/quotes/${quoteId}`);
      await expect(page.locator('h1')).toContainText(/Devis/i);
      await expect(page.locator(`text=${uniqueQuoteTitle}`)).toBeVisible();

      // Click Accept / Sign button
      const acceptBtn = page.locator('[data-testid="client-accept-quote-button"]');
      await expect(acceptBtn).toBeVisible();
      await acceptBtn.click();

      // Arrive on sign page /devis/[id]/sign
      await page.waitForURL(`**/devis/${quoteId}/sign`);
      await expect(page.locator('h1')).toContainText(/Signature du devis/i);

      // Draw signature on canvas
      const canvas = page.locator('[data-testid="signature-pad-canvas"]');
      await expect(canvas).toBeVisible();
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();

      await page.mouse.move(canvasBox!.x + 20, canvasBox!.y + 20);
      await page.mouse.down();
      await page.mouse.move(canvasBox!.x + 100, canvasBox!.y + 50);
      await page.mouse.move(canvasBox!.x + 150, canvasBox!.y + 20);
      await page.mouse.up();

      // Submit Signature
      const saveSigBtn = page.locator('[data-testid="signature-save-button"]');
      await expect(saveSigBtn).toBeEnabled();

      const [signResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/quotes/sign'), { timeout: 15000 }),
        saveSigBtn.click(),
      ]);

      if (!signResponse.ok()) {
        const body = await signResponse.text();
        console.error('CRITICAL: /api/quotes/sign failed with status', signResponse.status(), body);
      }

      // Wait for success screen
      await expect(page.locator('text=Devis signé !')).toBeVisible({ timeout: 15000 });

      // Verify DB: status = 'accepted', accepted_at is set, signature is stored
      const [acceptedQuoteDb] = await sql`SELECT status, accepted_at, signature FROM invoices WHERE id = ${quoteId}`;
      expect(acceptedQuoteDb.status).toBe('accepted');
      expect(acceptedQuoteDb.accepted_at).not.toBeNull();
      expect(acceptedQuoteDb.signature).not.toBeNull();

      // ==============================================================
      // 7. Pro Returns -> Devis is Immutable & Creates Deposit Invoice
      // ==============================================================
      await page.goto('/login');
      await page.fill('input[name="email"]', proEmail);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      await dismissSetupGuideIfPresent(page);

      await page.goto(`/facturation/devis/${quoteId}`);
      await dismissSetupGuideIfPresent(page);

      // Verify immutable state in UI
      await expect(page.locator('[data-testid="quote-status-badge"]')).toContainText(/Accepté/i);
      await expect(page.locator('[data-testid="send-quote-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-quote-button"]')).not.toBeVisible();

      // Create Deposit Invoice
      const depositBtn = page.locator('[data-testid="create-deposit-invoice-button"]');
      await expect(depositBtn).toBeVisible();
      await depositBtn.click();

      // Wait for redirection to created deposit invoice
      await page.waitForURL(/\/facturation\/factures\/[0-9a-fA-F-]+/, { timeout: 15000 });
      const depositInvoiceUrl = page.url();
      const depositInvoiceIdMatch = depositInvoiceUrl.match(/\/facturation\/factures\/([0-9a-fA-F-]+)/);
      expect(depositInvoiceIdMatch).toBeTruthy();
      const depositInvoiceId = depositInvoiceIdMatch![1];

      // Direct DB Verification of Deposit Invoice
      const [depositInvDb] = await sql`SELECT * FROM invoices WHERE id = ${depositInvoiceId}`;
      expect(depositInvDb).toBeDefined();
      expect(depositInvDb.type).toBe('invoice');
      expect(depositInvDb.source_quote_id).toBe(quoteId);
      expect(Number(depositInvDb.total_ttc)).toBe(Number(savedQuote.deposit_amount));

      // ==============================================================
      // 8. Simulate Stripe Payment Webhook
      // ==============================================================
      const depositAmountCents = Math.round(Number(depositInvDb.total_ttc) * 100);
      const webhookRes = await request.post('/api/stripe/webhook/simulate', {
        data: {
          invoiceId: depositInvoiceId,
          amountPaidCents: depositAmountCents,
        },
      });
      expect(webhookRes.status()).toBe(200);

      // Verify Deposit Invoice is Paid in DB
      const [paidDepositInvDb] = await sql`SELECT status, paid_at FROM invoices WHERE id = ${depositInvoiceId}`;
      expect(paidDepositInvDb.status).toBe('paid');
      expect(paidDepositInvDb.paid_at).not.toBeNull();

      // ==============================================================
      // 9. Pro Creates Work Order -> /operations/[id]
      // ==============================================================
      await page.goto(`/facturation/devis/${quoteId}`);
      await dismissSetupGuideIfPresent(page);

      const createWorkOrderBtn = page.locator('[data-testid="create-work-order-button"]');
      await expect(createWorkOrderBtn).toBeVisible();
      await createWorkOrderBtn.click();

      // Wait for redirection to /operations/[id]
      await page.waitForURL(/\/operations\/[0-9a-fA-F-]+/, { timeout: 15000 });
      const woUrl = page.url();
      const woIdMatch = woUrl.match(/\/operations\/([0-9a-fA-F-]+)/);
      expect(woIdMatch).toBeTruthy();
      const workOrderId = woIdMatch![1];

      // Direct DB Verification of Work Order
      const [woDb] = await sql`SELECT * FROM field_service_work_orders WHERE id = ${workOrderId}`;
      expect(woDb).toBeDefined();
      expect(woDb.source_quote_id).toBe(quoteId);
      expect(woDb.client_id).toBe(savedQuote.client_id);

      // ==============================================================
      // 10. Pro Converts Quote to Final Invoice with Prepaid Deduction
      // ==============================================================
      await page.goto(`/facturation/devis/${quoteId}`);
      await dismissSetupGuideIfPresent(page);

      const finalInvoiceBtn = page.locator('[data-testid="create-final-invoice-button"]');
      await expect(finalInvoiceBtn).toBeVisible();
      await finalInvoiceBtn.click();

      // Redirects to /facturation/factures/[finalInvoiceId]
      await page.waitForURL(/\/facturation\/factures\/[0-9a-fA-F-]+/, { timeout: 15000 });
      const finalInvUrl = page.url();
      const finalInvIdMatch = finalInvUrl.match(/\/facturation\/factures\/([0-9a-fA-F-]+)/);
      expect(finalInvIdMatch).toBeTruthy();
      const finalInvoiceId = finalInvIdMatch![1];

      // Browser reload to verify true persistence
      await page.reload();
      await dismissSetupGuideIfPresent(page);

      // Direct DB Verification of Final Invoice
      const [finalInvDb] = await sql`SELECT * FROM invoices WHERE id = ${finalInvoiceId}`;
      expect(finalInvDb).toBeDefined();
      expect(finalInvDb.type).toBe('invoice');
      expect(finalInvDb.source_quote_id).toBe(quoteId);
      expect(Number(finalInvDb.total_ttc)).toBe(Number(savedQuote.total_ttc));
      expect(Number(finalInvDb.prepaid_amount)).toBe(Number(depositInvDb.total_ttc));
      const expectedDue = Math.round((Number(finalInvDb.total_ttc) - Number(finalInvDb.prepaid_amount)) * 100) / 100;
      expect(Number(finalInvDb.amount_due)).toBe(expectedDue);

      // Verify multi-rate lines copied
      const finalLinesInDb = await sql`SELECT * FROM invoice_lines WHERE invoice_id = ${finalInvoiceId}`;
      expect(finalLinesInDb.length).toBeGreaterThanOrEqual(3);

    } finally {
      await sql.end();
    }
  });
});
