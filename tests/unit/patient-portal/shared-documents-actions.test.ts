import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMySharedDocumentsAction,
  getPatientSharedDocumentDownloadUrlAction,
} from '@/app/actions/patient-portal.actions';
import { setClinicalDocumentPatientVisibleAction } from '@/app/actions/clinical-record.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import type { PatientSharedDocumentDTO } from '@/lib/patient-portal/types';
import type { ClinicalDocumentDTO } from '@/lib/clinical/types';
import type { PatientPortalUserContext } from '@/lib/patient-portal/auth';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/patient-portal/auth', () => ({
  requirePatientPortalAccess: vi.fn(),
}));

vi.mock('@/lib/services/patient-portal.service', () => ({
  patientPortalService: {
    getSharedDocumentsForPortal: vi.fn(),
    getSharedDocumentDownloadUrl: vi.fn(),
  },
}));

vi.mock('@/lib/services/clinical-record.service', () => ({
  clinicalRecordService: {
    setDocumentPatientVisible: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Shared Documents Actions', () => {
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

  describe('setClinicalDocumentPatientVisibleAction', () => {
    it('allows practitioner to toggle patient visibility', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      const mockDoc: ClinicalDocumentDTO = {
        id: 'doc-1',
        organizationId: mockPractitionerCtx.organizationId,
        patientId: 'pat-1',
        practitionerId: mockPractitionerCtx.practitionerId,
        careEpisodeId: null,
        encounterId: null,
        title: 'Bilan initial',
        category: 'report',
        fileName: 'bilan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10240,
        storagePath: 'org/doc.pdf',
        patientVisible: true,
        isArchived: false,
        createdAt: '2026-09-14T20:00:00.000Z',
        updatedAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(clinicalRecordService.setDocumentPatientVisible).mockResolvedValue(mockDoc);

      const res = await setClinicalDocumentPatientVisibleAction('pat-1', {
        documentId: 'doc-1',
        patientVisible: true,
      });

      expect(clinicalRecordService.setDocumentPatientVisible).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        'pat-1',
        mockPractitionerCtx.practitionerId,
        'doc-1',
        true,
      );
      expect(res.patientVisible).toBe(true);
    });
  });

  describe('getMySharedDocumentsAction', () => {
    it('returns only patient-visible documents to the patient', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      const mockDocs: PatientSharedDocumentDTO[] = [
        {
          id: 'doc-1',
          organizationId: mockPatientCtx.organizationId,
          patientId: mockPatientCtx.patientId,
          title: 'Compte-rendu bilan',
          category: 'report',
          fileName: 'bilan.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10240,
          createdAt: '2026-09-14T20:00:00.000Z',
        },
      ];
      vi.mocked(patientPortalService.getSharedDocumentsForPortal).mockResolvedValue(mockDocs);

      const res = await getMySharedDocumentsAction();

      expect(patientPortalService.getSharedDocumentsForPortal).toHaveBeenCalledWith(
        mockPatientCtx.organizationId,
        mockPatientCtx.patientId,
      );
      expect(res.length).toBe(1);
      expect(res[0].fileName).toBe('bilan.pdf');
    });
  });

  describe('getPatientSharedDocumentDownloadUrlAction', () => {
    it('returns short-lived signed URL for document download', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      vi.mocked(patientPortalService.getSharedDocumentDownloadUrl).mockResolvedValue({
        downloadUrl: 'https://storage.supabase.co/signed/doc-1?token=xyz',
        fileName: 'bilan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10240,
      });

      const res = await getPatientSharedDocumentDownloadUrlAction('doc-1');

      expect(patientPortalService.getSharedDocumentDownloadUrl).toHaveBeenCalledWith(
        mockPatientCtx.organizationId,
        mockPatientCtx.patientId,
        'doc-1',
      );
      expect(res.downloadUrl).toContain('https://storage.supabase.co');
    });
  });
});
