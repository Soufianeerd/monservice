import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPatientInvoiceAction,
  listPatientInvoicesAction,
  getMyPatientInvoicesAction,
} from '@/app/actions/patient-billing.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientBillingService } from '@/lib/services/patient-billing.service';
import type { PatientInvoiceDTO } from '@/lib/patient-billing/types';
import type { PatientPortalUserContext } from '@/lib/patient-portal/auth';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/patient-portal/auth', () => ({
  requirePatientPortalAccess: vi.fn(),
}));

vi.mock('@/lib/services/patient-billing.service', () => ({
  patientBillingService: {
    createPatientInvoice: vi.fn(),
    listPatientInvoices: vi.fn(),
    getMyPatientInvoices: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Patient Billing Bridge Actions', () => {
  const mockPractitionerCtx = {
    userId: 'user-pro-1',
    organizationId: 'org-health-1',
    practitionerId: 'practitioner-1',
    email: 'pro@cabinet.fr',
  };

  const mockPatientCtx: PatientPortalUserContext = {
    userId: 'user-pat-1',
    organizationId: 'org-health-1',
    patientId: 'pat-1',
    accessType: 'patient',
    representativeId: null,
    accessiblePatientIds: ['pat-1'],
    email: 'patient@email.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPatientInvoiceAction', () => {
    it('practitioner generates invoice bridge linked to recipientUserId', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      const mockInvoice: PatientInvoiceDTO = {
        id: 'inv-1',
        organizationId: mockPractitionerCtx.organizationId,
        invoiceNumber: 'FAC-2026-001',
        issueDate: '2026-09-14',
        dueDate: '2026-09-30',
        status: 'sent',
        totalHT: 50,
        totalTTC: 50,
        currency: 'EUR',
        recipientUserId: 'user-pat-1',
        patientId: 'pat-1',
        lines: [
          {
            id: 'line-1',
            invoiceId: 'inv-1',
            description: 'Séance de kinésithérapie',
            quantity: 1,
            unitPrice: 50,
            taxRate: 0,
            totalHT: 50,
            totalTTC: 50,
          },
        ],
      };
      vi.mocked(patientBillingService.createPatientInvoice).mockResolvedValue(mockInvoice);

      const res = await createPatientInvoiceAction('pat-1', {
        dueDate: '2026-09-30',
        lines: [
          {
            description: 'Séance de kinésithérapie',
            quantity: 1,
            unitPrice: 50,
            vatRate: 0,
          },
        ],
      });

      expect(patientBillingService.createPatientInvoice).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        mockPractitionerCtx.practitionerId,
        mockPractitionerCtx.userId,
        expect.objectContaining({
          patientId: 'pat-1',
          dueDate: '2026-09-30',
        }),
      );
      expect(res.invoiceNumber).toBe('FAC-2026-001');
      expect(res.totalTTC).toBe(50);
    });
  });

  describe('listPatientInvoicesAction', () => {
    it('practitioner lists patient invoices', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      vi.mocked(patientBillingService.listPatientInvoices).mockResolvedValue([]);

      await listPatientInvoicesAction('pat-1');

      expect(patientBillingService.listPatientInvoices).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        'pat-1',
      );
    });
  });

  describe('getMyPatientInvoicesAction', () => {
    it('patient views own invoices via portal', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      vi.mocked(patientBillingService.getMyPatientInvoices).mockResolvedValue([]);

      await getMyPatientInvoicesAction();

      expect(patientBillingService.getMyPatientInvoices).toHaveBeenCalledWith(
        mockPatientCtx.userId,
        mockPatientCtx.patientId,
      );
    });
  });
});
