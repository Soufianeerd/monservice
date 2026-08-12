import { describe, it, expect } from 'vitest';
import { EinvoiceService } from '@/lib/services/einvoice.service';
import frInvoice from '@/lib/data/fixtures/compliance/fr-invoice.json';
import deInvoice from '@/lib/data/fixtures/compliance/de-invoice.json';
import beInvoice from '@/lib/data/fixtures/compliance/be-invoice.json';
import luInvoice from '@/lib/data/fixtures/compliance/lu-invoice.json';

describe('E-invoice – Compliance Tests', () => {
  const einvoiceService = new EinvoiceService();

  it('BE B2B should generate Peppol BIS', async () => {
    const format = await (einvoiceService as any).determineFormat(beInvoice as any);
    expect(format).toBe('PeppolBIS');
  });

  it('FR should generate Factur-X', async () => {
    const format = await (einvoiceService as any).determineFormat(frInvoice as any);
    expect(format).toBe('Factur-X');
  });

  it('DE should generate XRechnung', async () => {
    const format = await (einvoiceService as any).determineFormat(deInvoice as any);
    expect(format).toBe('XRechnung');
  });

  it('LU should generate Peppol BIS for B2B', async () => {
    const format = await (einvoiceService as any).determineFormat(luInvoice as any);
    expect(format).toBe('XRechnung');
  });
});
