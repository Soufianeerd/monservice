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

    const mockInvoice: Invoice = {
      id: 'inv-1',
      organizationId: 'org-health-1',
      recipientUserId: 'patient-user-123',
      clientId: 'client-crm-1',
      invoiceNumber: 'FAC-2026-001',
      issueDate: '2026-09-14',
      dueDate: '2026-09-30',
      totalHT: 50,
      taxAmount: 0,
      totalTTC: 50,
      currency: 'EUR',
      status: 'sent',
      lines: [],
      createdAt: '2026-09-14T20:00:00.000Z',
      updatedAt: '2026-09-14T20:00:00.000Z',
    };

    vi.mocked(invoiceService.getById).mockResolvedValue(mockInvoice);
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
      mockInvoice,
      expect.stringContaining('/client/invoices/inv-1?payment=success'),
      expect.stringContaining('/client/invoices/inv-1?payment=cancel'),
    );
  });

  it('rejects payment with 403 when authenticated user is neither pro nor invoice recipient', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      userId: 'attacker-user-999',
      email: 'attacker@evil.com',
      profileType: 'client',
      organizationId: 'other-org',
    });

    const mockInvoice: Invoice = {
      id: 'inv-1',
      organizationId: 'org-health-1',
      recipientUserId: 'patient-user-123',
      clientId: 'client-crm-1',
      invoiceNumber: 'FAC-2026-001',
      issueDate: '2026-09-14',
      dueDate: '2026-09-30',
      totalHT: 50,
      taxAmount: 0,
      totalTTC: 50,
      currency: 'EUR',
      status: 'sent',
      lines: [],
      createdAt: '2026-09-14T20:00:00.000Z',
      updatedAt: '2026-09-14T20:00:00.000Z',
    };

    vi.mocked(invoiceService.getById).mockResolvedValue(mockInvoice);

    const req = new NextRequest('http://localhost/api/stripe/create-payment', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'inv-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
