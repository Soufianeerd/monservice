import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';

// Mock session auth module
vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
  requireOrganization: vi.fn(),
  requireProfessional: vi.fn(),
  requireProfileType: vi.fn(),
  getSessionContext: vi.fn(),
}));

// Mock invoice service
vi.mock('@/lib/services/invoice.service', () => ({
  invoiceService: {
    getById: vi.fn(),
    findById: vi.fn(),
    updateSignature: vi.fn(),
  },
}));

// Mock storage service
vi.mock('@/lib/storage/storage.service', () => ({
  storageService: {
    getFileBuffer: vi.fn(),
  },
}));

// Mock delivery service
vi.mock('@/lib/services/delivery.service', () => ({
  DeliveryService: class {
    sendInvoice = vi.fn().mockResolvedValue({ success: true, trackingId: 'track_123' });
  },
}));

// Mock reminder service
vi.mock('@/lib/services/reminder.service', () => ({
  reminderService: {
    checkAndSendRemindersForAllOrganizations: vi.fn().mockResolvedValue({ sent: 5 }),
    checkAndSendReminders: vi.fn().mockResolvedValue({ sent: 2 }),
  },
}));

// Mock RBAC service
vi.mock('@/lib/services/rbac.service', () => ({
  RBACService: class {
    require = vi.fn().mockImplementation(async (userId: string) => {
      if (userId === 'user_unauthorized') {
        throw new AppError('Permission denied', 403, 'FORBIDDEN');
      }
    });
    can = vi.fn().mockImplementation(async (userId: string) => {
      return userId === 'admin_user';
    });
    getUserRoles = vi.fn().mockImplementation(async (userId: string) => {
      return userId === 'admin_user' ? ['admin'] : ['member'];
    });
  },
}));

// Mock audit service
vi.mock('@/lib/services/audit.service', () => ({
  AuditService: class {
    getLogs = vi.fn().mockResolvedValue([{ id: 'log_1', action: 'test' }]);
    exportLogs = vi.fn().mockResolvedValue('id,action\nlog_1,test');
  },
}));

// Mock breach service
vi.mock('@/lib/services/breach.service', () => ({
  breachService: {
    reportBreach: vi.fn().mockResolvedValue({ id: 'breach_1', title: 'test' }),
    getById: vi.fn().mockImplementation(async (id, orgId) => {
      if (id === 'breach_orgA' && orgId === 'org_a') {
        return { id: 'breach_orgA', organizationId: 'org_a' };
      }
      return null;
    }),
    updateBreachStatus: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock DSAR service
vi.mock('@/lib/services/dsar.service', () => ({
  dsarService: {
    createRequest: vi.fn().mockResolvedValue({ id: 'dsar_1', status: 'RECEIVED' }),
    getById: vi.fn().mockImplementation(async (id, orgId) => {
      if (id === 'dsar_orgA' && orgId === 'org_a') {
        return { id: 'dsar_orgA', organizationId: 'org_a' };
      }
      return null;
    }),
    processRequest: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock MFA service
vi.mock('@/lib/services/mfa.service', () => ({
  mfaService: {
    generateSecret: vi.fn().mockResolvedValue({ secret: 'MFA_SEC', otpauthUrl: 'otpauth://...' }),
    generateQRCode: vi.fn().mockResolvedValue('data:image/png;base64,...'),
    disableMFA: vi.fn().mockResolvedValue(true),
    verifyCode: vi.fn().mockImplementation(async (userId, code) => {
      return code === '123456';
    }),
    enableMFA: vi.fn().mockResolvedValue(true),
  },
}));

import { requireSession, requireProfessional, getSessionContext } from '@/lib/auth/session';
import { invoiceService } from '@/lib/services/invoice.service';
import { storageService } from '@/lib/storage/storage.service';

import { POST as sendInvoiceHandler } from '@/app/api/invoices/[id]/send/route';
import { GET as downloadInvoiceHandler } from '@/app/api/invoices/[id]/download/route';
import { GET as deliveryStatusHandler } from '@/app/api/invoices/[id]/delivery-status/route';
import { GET as remindersCheckHandler } from '@/app/api/reminders/check/route';
import { GET as adminAuditHandler } from '@/app/api/admin/audit/route';
import { GET as adminAuditExportHandler } from '@/app/api/admin/audit/export/route';
import { POST as createBreachHandler, PUT as updateBreachHandler } from '@/app/api/privacy/breach/route';
import { POST as createDsarHandler, PUT as processDsarHandler } from '@/app/api/privacy/dsar/route';
import { POST as verifyMfaHandler } from '@/app/api/auth/mfa/verify/route';

describe('API Security Baseline & Authorization Matrix (Session 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invoice Send Endpoint (/api/invoices/[id]/send)', () => {
    it('allows professional issuer to send invoice', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'pro_a',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'pro@org-a.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
      } as any);

      const req = new NextRequest('http://localhost/api/invoices/inv_1/send', { method: 'POST' });
      const res = await sendInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('rejects client account attempting to send invoice (403)', async () => {
      vi.mocked(requireProfessional).mockRejectedValueOnce(
        new AppError('Accès réservé aux comptes professionnels', 403, 'FORBIDDEN_PROFILE')
      );

      const req = new NextRequest('http://localhost/api/invoices/inv_1/send', { method: 'POST' });
      const res = await sendInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(403);
    });

    it('rejects cross-tenant professional (403)', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'pro_b',
        organizationId: 'org_b',
        profileType: 'professional',
        email: 'pro@org-b.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
      } as any);

      const req = new NextRequest('http://localhost/api/invoices/inv_1/send', { method: 'POST' });
      const res = await sendInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(403);
    });
  });

  describe('Invoice Download Endpoint (/api/invoices/[id]/download)', () => {
    it('allows professional issuer to download structured invoice', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'pro_a',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'pro@org-a.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
        structuredInvoicePath: 'invoices/org_a/inv_1.xml',
      } as any);
      vi.mocked(storageService.getFileBuffer).mockResolvedValueOnce(Buffer.from('<xml>invoice</xml>'));

      const req = new NextRequest('http://localhost/api/invoices/inv_1/download?format=xml');
      const res = await downloadInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/xml');
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });

    it('allows exact client recipient to download structured invoice', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'client_a',
        organizationId: 'org_a',
        profileType: 'client',
        email: 'client@org-a.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
        structuredInvoicePath: 'invoices/org_a/inv_1.xml',
      } as any);
      vi.mocked(storageService.getFileBuffer).mockResolvedValueOnce(Buffer.from('<xml>invoice</xml>'));

      const req = new NextRequest('http://localhost/api/invoices/inv_1/download?format=xml');
      const res = await downloadInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(200);
    });

    it('rejects another client from the same org (403)', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'client_other',
        organizationId: 'org_a',
        profileType: 'client',
        email: 'other@org-a.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
        structuredInvoicePath: 'invoices/org_a/inv_1.xml',
      } as any);

      const req = new NextRequest('http://localhost/api/invoices/inv_1/download?format=xml');
      const res = await downloadInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(403);
    });

    it('rejects unsupported format with 400', async () => {
      const req = new NextRequest('http://localhost/api/invoices/inv_1/download?format=exe');
      const res = await downloadInvoiceHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(400);
    });
  });

  describe('Invoice Delivery Status Endpoint (/api/invoices/[id]/delivery-status)', () => {
    it('returns full tracking details for professional issuer', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'pro_a',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'pro@org-a.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
        deliveryStatus: 'delivered',
        deliveryChannel: 'email',
        deliveryTrackingId: 'track_sensitive_999',
        deliveryAttempts: 1,
        deliverySentAt: new Date('2026-09-01T10:00:00Z'),
      } as any);

      const req = new NextRequest('http://localhost/api/invoices/inv_1/delivery-status');
      const res = await deliveryStatusHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deliveryTrackingId).toBe('track_sensitive_999');
      expect(data.deliveryChannel).toBe('email');
    });

    it('returns minimized data for client recipient (no tracking id/channel)', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'client_a',
        organizationId: 'org_a',
        profileType: 'client',
        email: 'client@org-a.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
        deliveryStatus: 'delivered',
        deliveryChannel: 'email',
        deliveryTrackingId: 'track_sensitive_999',
        deliveryAttempts: 1,
        deliverySentAt: new Date('2026-09-01T10:00:00Z'),
      } as any);

      const req = new NextRequest('http://localhost/api/invoices/inv_1/delivery-status');
      const res = await deliveryStatusHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoiceId).toBe('inv_1');
      expect(data.deliveryStatus).toBe('delivered');
      expect(data.deliveryTrackingId).toBeUndefined();
      expect(data.deliveryChannel).toBeUndefined();
    });

    it('rejects cross-tenant professional (403)', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'pro_b',
        organizationId: 'org_b',
        profileType: 'professional',
        email: 'pro@org-b.com',
      });
      vi.mocked(invoiceService.getById).mockResolvedValueOnce({
        id: 'inv_1',
        organizationId: 'org_a',
        recipientUserId: 'client_a',
      } as any);

      const req = new NextRequest('http://localhost/api/invoices/inv_1/delivery-status');
      const res = await deliveryStatusHandler(req, { params: Promise.resolve({ id: 'inv_1' }) });

      expect(res.status).toBe(403);
    });
  });

  describe('Reminders Check Endpoint (/api/reminders/check)', () => {
    it('allows global cron with valid x-cron-secret', async () => {
      process.env.CRON_SECRET = 'valid_cron_secret_123';
      const req = new Request('http://localhost/api/reminders/check', {
        headers: { 'x-cron-secret': 'valid_cron_secret_123' },
      });

      const res = await remindersCheckHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(5);
    });

    it('allows professional session for own organization', async () => {
      process.env.CRON_SECRET = 'valid_cron_secret_123';
      vi.mocked(getSessionContext).mockResolvedValueOnce({
        userId: 'pro_a',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'pro@org-a.com',
      });

      const req = new Request('http://localhost/api/reminders/check');
      const res = await remindersCheckHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(2);
    });

    it('denies client user (403)', async () => {
      vi.mocked(getSessionContext).mockResolvedValueOnce({
        userId: 'client_a',
        organizationId: 'org_a',
        profileType: 'client',
        email: 'client@org-a.com',
      });

      const req = new Request('http://localhost/api/reminders/check');
      const res = await remindersCheckHandler(req);
      expect(res.status).toBe(403);
    });

    it('denies unauthenticated caller without secret (401)', async () => {
      vi.mocked(getSessionContext).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/reminders/check');
      const res = await remindersCheckHandler(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Admin Audit Endpoints (/api/admin/audit & export)', () => {
    it('allows authorized professional with audit:view RBAC permission', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'admin_pro',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'admin@org-a.com',
      });

      const res = await adminAuditHandler();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.logs).toBeDefined();
    });

    it('denies professional without audit:view RBAC permission (403)', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'user_unauthorized',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'unauth@org-a.com',
      });

      const res = await adminAuditHandler();
      expect(res.status).toBe(403);
    });

    it('allows audit export for authorized professional', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'admin_pro',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'admin@org-a.com',
      });

      const req = new Request('http://localhost/api/admin/audit/export?format=csv');
      const res = await adminAuditExportHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/csv');
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });
  });

  describe('Privacy Breach & DSAR Endpoints', () => {
    it('allows reporting data breach for professional context', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'pro_a',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'pro@org-a.com',
      });

      const req = new NextRequest('http://localhost/api/privacy/breach', {
        method: 'POST',
        body: JSON.stringify({ title: 'Incident A', description: 'Test desc' }),
      });
      const res = await createBreachHandler(req);
      expect(res.status).toBe(200);
    });

    it('rejects updating cross-tenant breach status (404)', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'pro_b',
        organizationId: 'org_b',
        profileType: 'professional',
        email: 'pro@org-b.com',
      });

      const req = new NextRequest('http://localhost/api/privacy/breach', {
        method: 'PUT',
        body: JSON.stringify({ id: 'breach_orgA', status: 'closed' }),
      });
      const res = await updateBreachHandler(req);
      expect(res.status).toBe(404);
    });

    it('allows authorized actor to process DSAR request', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'admin_user',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'admin@org-a.com',
      });

      const req = new NextRequest('http://localhost/api/privacy/dsar', {
        method: 'PUT',
        body: JSON.stringify({ requestId: 'dsar_orgA', status: 'COMPLETED', response: 'Done' }),
      });
      const res = await processDsarHandler(req);
      expect(res.status).toBe(200);
    });

    it('rejects DSAR processing for professional without permission (403)', async () => {
      vi.mocked(requireProfessional).mockResolvedValueOnce({
        userId: 'user_unauthorized',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'unauth@org-a.com',
      });

      const req = new NextRequest('http://localhost/api/privacy/dsar', {
        method: 'PUT',
        body: JSON.stringify({ requestId: 'dsar_orgA', status: 'COMPLETED' }),
      });
      const res = await processDsarHandler(req);
      expect(res.status).toBe(403);
    });
  });

  describe('MFA Verify Endpoint (/api/auth/mfa/verify)', () => {
    it('accepts valid 6-digit TOTP code', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'user_1',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'user@org-a.com',
      });

      const req = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: '123456' }),
      });
      const res = await verifyMfaHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('rejects malformed non-6-digit TOTP code (400)', async () => {
      vi.mocked(requireSession).mockResolvedValueOnce({
        userId: 'user_1',
        organizationId: 'org_a',
        profileType: 'professional',
        email: 'user@org-a.com',
      });

      const req = new NextRequest('http://localhost/api/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'abc' }),
      });
      const res = await verifyMfaHandler(req);
      expect(res.status).toBe(400);
    });
  });
});
