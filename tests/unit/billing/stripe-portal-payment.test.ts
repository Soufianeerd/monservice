import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/stripe/create-payment/route';
import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { invoiceService } from '@/lib/services/invoice.service';
import { isStripeConfigured } from '@/lib/stripe';
import { createInvoicePaymentSession } from '@/lib/stripe/payment';
import type { Invoice } from '@/lib/data/interfaces';

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
}));

vi.mock('@/lib/services/invoice.service', () => ({
  invoiceService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/stripe/payment', () => ({
  createInvoicePaymentSession: vi.fn(),
}));

describe('Stripe Patient Portal Payment Authorization', () => {
  const baseInvoice: Invoice = {
    id: 'inv-1',
    organizationId: 'org-health-1',
    type: 'invoice',
    number: 'FAC-2026-001',
    date: '2026-09-14',
    dueDate: '2026-09-30',
    recipientUserId: 'patient-user-123',
    clientId: 'client-crm-1',
    totalHT: 50,
    taxAmount: 0,
    totalTTC: 50,
    status: 'sent',
    lines: [],
    createdAt: '2026-09-14T20:00:00.000Z',
    updatedAt: '2026-09-14T20:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isStripeConfigured).mockReturnValue(true);
  });

  it('allows payment session creation when invoice recipientUserId matches authenticated patient user', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      userId: 'patient-user-123',
      email: 'pat@cabinet.fr',
      profileType: 'client',
      organizationId: null,
    });

    vi.mocked(invoiceService.getById).mockResolvedValue(baseInvoice);
    vi.mocked(createInvoicePaymentSession).mockResolvedValue('https://checkout.stripe.com/c/pay/cs_test_123');

    const req = new NextRequest('http://localhost/api/stripe/create-payment', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'inv-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    expect(createInvoicePaymentSession).toHaveBeenCalledWith(
      baseInvoice,
      expect.stringContaining('/client/invoices/inv-1?payment=success'),
      expect.stringContaining('/client/invoices/inv-1?payment=cancel'),
    );
  });

  it('rejects same-tenant client attacker targeting another patient invoice (P0 same-tenant client attack test)', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      userId: 'attacker-client-456',
      email: 'attacker@cabinet.fr',
      profileType: 'client',
      organizationId: 'org-health-1', // Same organization
    });

    vi.mocked(invoiceService.getById).mockResolvedValue(baseInvoice); // Recipient is patient-user-123

    const req = new NextRequest('http://localhost/api/stripe/create-payment', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'inv-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(createInvoicePaymentSession).not.toHaveBeenCalled();
  });

  it('allows professional issuer of the organization to initiate payment session', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      userId: 'pro-user-1',
      email: 'pro@cabinet.fr',
      profileType: 'professional',
      organizationId: 'org-health-1', // Matching org
    });

    vi.mocked(invoiceService.getById).mockResolvedValue(baseInvoice);
    vi.mocked(createInvoicePaymentSession).mockResolvedValue('https://checkout.stripe.com/c/pay/cs_test_pro');

    const req = new NextRequest('http://localhost/api/stripe/create-payment', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'inv-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe('https://checkout.stripe.com/c/pay/cs_test_pro');
    expect(createInvoicePaymentSession).toHaveBeenCalled();
  });

  it('rejects cross-tenant professional trying to initiate payment session for other org invoice', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      userId: 'pro-user-b',
      email: 'pro@other-cabinet.fr',
      profileType: 'professional',
      organizationId: 'org-other-2', // Different org
    });

    vi.mocked(invoiceService.getById).mockResolvedValue(baseInvoice);

    const req = new NextRequest('http://localhost/api/stripe/create-payment', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'inv-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(createInvoicePaymentSession).not.toHaveBeenCalled();
  });
});
