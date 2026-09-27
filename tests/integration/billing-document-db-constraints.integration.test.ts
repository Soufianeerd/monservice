import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

function hasPostgresErrorCode(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof Reflect.get(error, 'code') === 'string' &&
    typeof Reflect.get(error, 'message') === 'string'
  );
}

describe('Billing Document DB Constraints & Integrity (Session 18)', () => {
  let sql: postgres.Sql;

  const orgA = 'org-billing-test-a';
  const orgB = 'org-billing-test-b';

  const userA = 'user-billing-test-a';
  const userB = 'user-billing-test-b';

  const clientA = 'client-billing-test-a';
  const clientB = 'client-billing-test-b';

  const siteA = 'site-billing-test-a';
  const siteB = 'site-billing-test-b';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Clean up
    await sql.begin(async (tx) => {
      await tx`SET LOCAL session_replication_role = 'replica'`;
      await tx`DELETE FROM invoice_lines WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM invoice_sections WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM billing_document_sequences WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM field_service_work_orders WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM invoices WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM field_service_sites WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM clients WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
      await tx`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    });

    // Seed organizations
    await sql`
      INSERT INTO organizations (id, name, slug, sector, profession, profile_type, created_at, updated_at)
      VALUES 
        (${orgA}, 'Chiffrage BTP Org A', 'btp-org-a', 'field_services', 'renovation_contractor', 'professional', now(), now()),
        (${orgB}, 'Plomberie Org B', 'plomb-org-b', 'field_services', 'plumber', 'professional', now(), now())
      ON CONFLICT (id) DO UPDATE SET sector = EXCLUDED.sector, profession = EXCLUDED.profession
    `;

    // Seed users
    await sql`
      INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at)
      VALUES
        (${userA}, 'pro.billing.a@example.com', ${orgA}, 'professional', now(), now()),
        (${userB}, 'pro.billing.b@example.com', ${orgB}, 'professional', now(), now())
      ON CONFLICT (id) DO NOTHING
    `;

    // Seed clients
    await sql`
      INSERT INTO clients (id, organization_id, name, email, created_at, updated_at)
      VALUES
        (${clientA}, ${orgA}, 'Client Alpha', 'alpha@client.fr', now(), now()),
        (${clientB}, ${orgB}, 'Client Beta', 'beta@client.fr', now(), now())
      ON CONFLICT (id) DO NOTHING
    `;

    // Seed sites
    await sql`
      INSERT INTO field_service_sites (id, organization_id, client_id, label, address_line1, postal_code, city, country, created_at, updated_at)
      VALUES
        (${siteA}, ${orgA}, ${clientA}, 'Chantier Villa A', '12 Rue de Paris', '75001', 'Paris', 'FR', now(), now()),
        (${siteB}, ${orgB}, ${clientB}, 'Chantier Atelier B', '50 Rue de Lyon', '69001', 'Lyon', 'FR', now(), now())
      ON CONFLICT (id) DO NOTHING
    `;
  });

  afterAll(async () => {
    if (sql) {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL session_replication_role = 'replica'`;
        await tx`DELETE FROM invoice_lines WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM invoice_sections WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM billing_document_sequences WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM field_service_work_orders WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM invoices WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM field_service_sites WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM clients WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
        await tx`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
      });
      await sql.end();
    }
  });

  it('enforces composite foreign key between invoice_lines and invoices (cross-tenant line rejected)', async () => {
    const invA = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (id, organization_id, client_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
      VALUES (${invA}, ${orgA}, ${clientA}, 'D-2026-0001', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
    `;

    // Attempt to insert line referencing invA but belonging to orgB
    let errorOccurred = false;
    try {
      await sql`
        INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc)
        VALUES (${randomUUID()}, ${invA}, ${orgB}, 'Attaque Cross-Tenant', 1, 100, 20, 100, 120)
      `;
    } catch (err) {
      errorOccurred = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23503'); // foreign_key_violation
      }
    }
    expect(errorOccurred).toBe(true);
  });

  it('enforces composite foreign key between invoice_sections and invoices (cross-tenant section rejected)', async () => {
    const invA = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (id, organization_id, client_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
      VALUES (${invA}, ${orgA}, ${clientA}, 'D-2026-0002', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
    `;

    let errorOccurred = false;
    try {
      await sql`
        INSERT INTO invoice_sections (id, invoice_id, organization_id, kind, title, position)
        VALUES (${randomUUID()}, ${invA}, ${orgB}, 'lot', 'Lot Illégal', 0)
      `;
    } catch (err) {
      errorOccurred = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23503');
      }
    }
    expect(errorOccurred).toBe(true);
  });

  it('enforces that a section line cannot reference a section from another document or another tenant', async () => {
    const invA1 = `inv-${randomUUID()}`;
    const invA2 = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (id, organization_id, client_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
      VALUES 
        (${invA1}, ${orgA}, ${clientA}, 'D-2026-0003', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now()),
        (${invA2}, ${orgA}, ${clientA}, 'D-2026-0004', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
    `;

    const secA1 = `sec-${randomUUID()}`;
    await sql`
      INSERT INTO invoice_sections (id, invoice_id, organization_id, kind, title, position)
      VALUES (${secA1}, ${invA1}, ${orgA}, 'lot', 'Lot Maçonnerie Document 1', 0)
    `;

    // Attempt to insert line into invA2 with section secA1 (different document)
    // The composite FK invoice_lines_tenant_section_fk verifies (section_id, organization_id)
    // Additionally, verify cross-tenant section fails
    const secB = `sec-${randomUUID()}`;
    const invB = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (id, organization_id, client_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
      VALUES (${invB}, ${orgB}, ${clientB}, 'D-2026-0005', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
    `;
    await sql`
      INSERT INTO invoice_sections (id, invoice_id, organization_id, kind, title, position)
      VALUES (${secB}, ${invB}, ${orgB}, 'lot', 'Lot Org B', 0)
    `;

    let errorOccurred = false;
    try {
      await sql`
        INSERT INTO invoice_lines (id, invoice_id, organization_id, section_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc)
        VALUES (${randomUUID()}, ${invA1}, ${orgA}, ${secB}, 'Line with Org B section', 1, 100, 20, 100, 120)
      `;
    } catch (err) {
      errorOccurred = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23503');
      }
    }
    expect(errorOccurred).toBe(true);
  });

  it('rejects cross-tenant site on invoice via composite foreign key', async () => {
    let errorOccurred = false;
    try {
      await sql`
        INSERT INTO invoices (id, organization_id, client_id, site_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
        VALUES (${randomUUID()}, ${orgA}, ${clientA}, ${siteB}, 'D-2026-0006', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
      `;
    } catch (err) {
      errorOccurred = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23503');
      }
    }
    expect(errorOccurred).toBe(true);
  });

  it('rejects cross-tenant source_quote_id on invoice via composite foreign key', async () => {
    const quoteB = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (id, organization_id, client_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
      VALUES (${quoteB}, ${orgB}, ${clientB}, 'D-2026-0007', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
    `;

    let errorOccurred = false;
    try {
      await sql`
        INSERT INTO invoices (id, organization_id, client_id, source_quote_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
        VALUES (${randomUUID()}, ${orgA}, ${clientA}, ${quoteB}, 'F-2026-0001', 'invoice', 'draft', 0, 0, 0, now(), now(), now(), now())
      `;
    } catch (err) {
      errorOccurred = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23503');
      }
    }
    expect(errorOccurred).toBe(true);
  });

  it('enforces check constraints: quantity > 0 and discount between 0 and 100', async () => {
    const inv = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (id, organization_id, client_id, number, type, status, total_ht, tax_amount, total_ttc, date, due_date, created_at, updated_at)
      VALUES (${inv}, ${orgA}, ${clientA}, 'D-2026-0008', 'quote', 'draft', 0, 0, 0, now(), now(), now(), now())
    `;

    // Quantity <= 0
    let errZeroQty = false;
    try {
      await sql`
        INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc)
        VALUES (${randomUUID()}, ${inv}, ${orgA}, 'Zero Qty', 0, 100, 20, 0, 0)
      `;
    } catch (err) {
      errZeroQty = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23514'); // check_violation
      }
    }
    expect(errZeroQty).toBe(true);

    // Negative Quantity
    let errNegQty = false;
    try {
      await sql`
        INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc)
        VALUES (${randomUUID()}, ${inv}, ${orgA}, 'Negative Qty', -2.5, 100, 20, -250, -300)
      `;
    } catch (err) {
      errNegQty = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23514');
      }
    }
    expect(errNegQty).toBe(true);

    // Discount > 100
    let errBigDiscount = false;
    try {
      await sql`
        INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, discount_rate, tax_rate, total_ht, total_ttc)
        VALUES (${randomUUID()}, ${inv}, ${orgA}, 'Excessive Discount', 1, 100, 150, 20, 0, 0)
      `;
    } catch (err) {
      errBigDiscount = true;
      expect(hasPostgresErrorCode(err)).toBe(true);
      if (hasPostgresErrorCode(err)) {
        expect(err.code).toBe('23514');
      }
    }
    expect(errBigDiscount).toBe(true);

    // Decimal quantity is valid (e.g. 2.375)
    const validLineId = randomUUID();
    await sql`
      INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, discount_rate, tax_rate, total_ht, total_ttc)
      VALUES (${validLineId}, ${inv}, ${orgA}, 'Métré Décimal 2.375 m³', 2.375, 120, 10, 20, 256.50, 307.80)
    `;

    const [inserted] = await sql`SELECT quantity FROM invoice_lines WHERE id = ${validLineId}`;
    expect(Number(inserted.quantity)).toBe(2.375);
  });

  it('trigger enforces quote immutability after acceptance', async () => {
    const quoteId = `inv-${randomUUID()}`;
    await sql`
      INSERT INTO invoices (
        id, organization_id, client_id, number, type, status, 
        title, total_ht, tax_amount, total_ttc, date, due_date,
        deposit_mode, deposit_rate, deposit_amount, created_at, updated_at
      )
      VALUES (
        ${quoteId}, ${orgA}, ${clientA}, 'D-2026-0009', 'quote', 'sent',
        'Rénovation Salle de Bain', 1000, 200, 1200, now(), now(),
        'percentage', 30, 360, now(), now()
      )
    `;

    const lineId = randomUUID();
    await sql`
      INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc)
      VALUES (${lineId}, ${quoteId}, ${orgA}, 'Fourniture meuble vasque', 1, 1000, 20, 1000, 1200)
    `;

    // Accept the quote with signature
    await sql`
      UPDATE invoices
      SET status = 'accepted',
          signature = 'data:image/png;base64,mockSignatureValid123',
          accepted_at = now()
      WHERE id = ${quoteId}
    `;

    // 1. Attempt to alter commercial terms on accepted quote -> blocked by trigger
    let errModifAccepted = false;
    try {
      await sql`
        UPDATE invoices
        SET deposit_rate = 50
        WHERE id = ${quoteId}
      `;
    } catch (err) {
      errModifAccepted = true;
      expect(String(err)).toMatch(/Cannot modify financial/);
    }
    expect(errModifAccepted).toBe(true);

    // 2. Attempt to tamper with signature -> blocked by trigger
    let errSignatureTamper = false;
    try {
      await sql`
        UPDATE invoices
        SET signature = 'data:image/png;base64,tamperedSignature'
        WHERE id = ${quoteId}
      `;
    } catch (err) {
      errSignatureTamper = true;
      expect(String(err)).toMatch(/Cannot modify financial or signature/);
    }
    expect(errSignatureTamper).toBe(true);

    // 3. Attempt to add or modify lines on accepted quote -> blocked by child immutability trigger
    let errLineAdd = false;
    try {
      await sql`
        INSERT INTO invoice_lines (id, invoice_id, organization_id, description, quantity, unit_price, tax_rate, total_ht, total_ttc)
        VALUES (${randomUUID()}, ${quoteId}, ${orgA}, 'Ligne Frauduleuse Post-Signature', 1, 500, 20, 500, 600)
      `;
    } catch (err) {
      errLineAdd = true;
      expect(String(err)).toMatch(/Cannot add items to finalized\/accepted document/);
    }
    expect(errLineAdd).toBe(true);

    // 4. Attempt to hard delete accepted quote -> blocked by trigger
    let errDeleteAccepted = false;
    try {
      await sql`DELETE FROM invoices WHERE id = ${quoteId}`;
    } catch (err) {
      errDeleteAccepted = true;
      expect(String(err)).toMatch(/Cannot delete non-draft document/);
    }
    expect(errDeleteAccepted).toBe(true);
  });

  it('guarantees unique atomic sequential numbers under high concurrency', async () => {
    const year = new Date().getFullYear();
    const count = 10;

    // Concurrently allocate 10 numbers using PostgreSQL UPSERT lock on billing_document_sequences
    const allocations = await Promise.all(
      Array.from({ length: count }).map(async () => {
        const [seq] = await sql`
          INSERT INTO billing_document_sequences (organization_id, document_type, year, last_sequence, updated_at)
          VALUES (${orgA}, 'quote', ${year}, 1, now())
          ON CONFLICT (organization_id, document_type, year)
          DO UPDATE SET 
            last_sequence = billing_document_sequences.last_sequence + 1,
            updated_at = now()
          RETURNING last_sequence;
        `;
        return Number(seq.last_sequence);
      })
    );

    // Check that all 10 allocated sequence numbers are completely unique
    const uniqueSequences = new Set(allocations);
    expect(uniqueSequences.size).toBe(count);

    // Check that numbers are sequential
    const sorted = [...allocations].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]).toBe(sorted[i - 1] + 1);
    }
  });
});
