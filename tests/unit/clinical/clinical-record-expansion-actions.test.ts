import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadClinicalDocumentAction,
  archiveClinicalDocumentAction,
  getClinicalDocumentDownloadUrlAction,
  createClinicalFormTemplateAction,
  createClinicalFormResponseAction,
  finalizeClinicalFormResponseAction,
  createClinicalMeasurementAction,
} from '@/app/actions/clinical-record.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { clinicalStorageService } from '@/lib/services/clinical-storage.service';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/services/clinical-record.service', () => ({
  clinicalRecordService: {
    createClinicalDocumentMetadata: vi.fn(),
    archiveClinicalDocument: vi.fn(),
    getClinicalDocument: vi.fn(),
    createFormTemplate: vi.fn(),
    updateFormTemplate: vi.fn(),
    createFormResponse: vi.fn(),
    updateDraftFormResponse: vi.fn(),
    finalizeFormResponse: vi.fn(),
    createMeasurement: vi.fn(),
  },
}));

vi.mock('@/lib/services/clinical-storage.service', () => ({
  clinicalStorageService: {
    uploadFile: vi.fn(),
    getSignedDownloadUrl: vi.fn(),
    removeFileAfterFailedMetadataWrite: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Clinical Record Expansion Server Actions', () => {
  const mockContext = {
    userId: 'user-pro-1',
    organizationId: 'org-health-1',
    practitionerId: 'practitioner-1',
    email: 'pro@cabinet.fr',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockContext);
  });

  describe('Document Actions & Atomicity', () => {
    it('uploadClinicalDocumentAction uses single canonical documentId for both storagePath segment 4 and DB row ID', async () => {
      const mockBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', mockBlob, 'prescription.pdf');
      formData.append('title', 'Ordonnance kiné');
      formData.append('category', 'prescription');

      let capturedStoragePath = '';
      let capturedDocIdInMeta = '';

      vi.mocked(clinicalStorageService.uploadFile).mockImplementation(async (path) => {
        capturedStoragePath = path;
      });

      vi.mocked(clinicalRecordService.createClinicalDocumentMetadata).mockImplementation(
        async (_org, _pat, _prac, meta) => {
          capturedDocIdInMeta = meta.id || '';
          return {
            id: meta.id || 'generated-id',
            organizationId: mockContext.organizationId,
            patientId: 'patient-1',
            practitionerId: mockContext.practitionerId,
            careEpisodeId: null,
            encounterId: null,
            title: meta.title,
            category: meta.category,
            fileName: meta.fileName,
            mimeType: meta.mimeType,
            sizeBytes: meta.sizeBytes,
            storagePath: meta.storagePath,
            isArchived: false,
            createdAt: '2026-09-12T10:00:00.000Z',
            updatedAt: '2026-09-12T10:00:00.000Z',
          };
        },
      );

      const result = await uploadClinicalDocumentAction('patient-1', formData);

      // Extract 4th segment (index 3) from storagePath: org/practitioner/patient/documentId/file.pdf
      const pathSegments = capturedStoragePath.split('/');
      const pathDocumentId = pathSegments[3];

      expect(pathSegments).toHaveLength(5);
      expect(pathDocumentId).toBeDefined();
      expect(pathDocumentId).toBe(capturedDocIdInMeta);
      expect(result.id).toBe(pathDocumentId);
      expect(clinicalStorageService.removeFileAfterFailedMetadataWrite).not.toHaveBeenCalled();
    });

    it('triggers internal storage rollback when DB metadata creation fails after upload', async () => {
      const mockBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', mockBlob, 'prescription.pdf');
      formData.append('title', 'Ordonnance kiné');
      formData.append('category', 'prescription');

      let capturedStoragePath = '';

      vi.mocked(clinicalStorageService.uploadFile).mockImplementation(async (path) => {
        capturedStoragePath = path;
      });

      const dbError = new Error('Database connection lost');
      vi.mocked(clinicalRecordService.createClinicalDocumentMetadata).mockRejectedValue(dbError);
      vi.mocked(clinicalStorageService.removeFileAfterFailedMetadataWrite).mockResolvedValue(undefined);

      await expect(uploadClinicalDocumentAction('patient-1', formData)).rejects.toThrow('Database connection lost');

      expect(clinicalStorageService.uploadFile).toHaveBeenCalledTimes(1);
      expect(clinicalRecordService.createClinicalDocumentMetadata).toHaveBeenCalledTimes(1);
      expect(clinicalStorageService.removeFileAfterFailedMetadataWrite).toHaveBeenCalledTimes(1);
      expect(clinicalStorageService.removeFileAfterFailedMetadataWrite).toHaveBeenCalledWith(capturedStoragePath);
    });

    it('does not attempt DB metadata creation or storage rollback if initial storage upload fails', async () => {
      const mockBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', mockBlob, 'prescription.pdf');
      formData.append('title', 'Ordonnance kiné');
      formData.append('category', 'prescription');

      vi.mocked(clinicalStorageService.uploadFile).mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(uploadClinicalDocumentAction('patient-1', formData)).rejects.toThrow('Storage quota exceeded');

      expect(clinicalRecordService.createClinicalDocumentMetadata).not.toHaveBeenCalled();
      expect(clinicalStorageService.removeFileAfterFailedMetadataWrite).not.toHaveBeenCalled();
    });

    it('archiveClinicalDocumentAction invokes service and revalidates path', async () => {
      vi.mocked(clinicalRecordService.archiveClinicalDocument).mockResolvedValue({
        id: 'doc-1',
        organizationId: mockContext.organizationId,
        patientId: 'patient-1',
        practitionerId: mockContext.practitionerId,
        careEpisodeId: null,
        encounterId: null,
        title: 'Ordonnance kiné',
        category: 'prescription',
        fileName: 'prescription.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
        storagePath: 'path',
        isArchived: true,
        createdAt: '2026-09-12T10:00:00.000Z',
        updatedAt: '2026-09-12T10:00:00.000Z',
      });

      const result = await archiveClinicalDocumentAction('patient-1', { documentId: 'doc-1' });

      expect(clinicalRecordService.archiveClinicalDocument).toHaveBeenCalledWith(
        mockContext.organizationId,
        'patient-1',
        mockContext.practitionerId,
        'doc-1',
      );
      expect(result.isArchived).toBe(true);
    });

    it('getClinicalDocumentDownloadUrlAction generates signed download URL with 60s TTL', async () => {
      vi.mocked(clinicalRecordService.getClinicalDocument).mockResolvedValue({
        id: 'doc-1',
        organizationId: mockContext.organizationId,
        patientId: 'patient-1',
        practitionerId: mockContext.practitionerId,
        careEpisodeId: null,
        encounterId: null,
        title: 'Doc',
        category: 'prescription',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
        storagePath: 'org-health-1/practitioner-1/patient-1/doc-1/doc.pdf',
        isArchived: false,
        createdAt: '2026-09-12T10:00:00.000Z',
        updatedAt: '2026-09-12T10:00:00.000Z',
      });

      vi.mocked(clinicalStorageService.getSignedDownloadUrl).mockResolvedValue(
        'https://supabase.co/signed-url',
      );

      const result = await getClinicalDocumentDownloadUrlAction('patient-1', { documentId: 'doc-1' });
      expect(result.downloadUrl).toBe('https://supabase.co/signed-url');
    });
  });

  describe('Form Template & Response Actions', () => {
    it('createClinicalFormTemplateAction validates input and calls service', async () => {
      vi.mocked(clinicalRecordService.createFormTemplate).mockResolvedValue({
        id: 'tpl-1',
        organizationId: mockContext.organizationId,
        practitionerId: mockContext.practitionerId,
        name: 'Bilan genou',
        kind: 'assessment',
        description: null,
        schemaJson: { fields: [{ id: 'score', label: 'Score', type: 'number', required: false }] },
        isActive: true,
        createdAt: '2026-09-12T10:00:00.000Z',
        updatedAt: '2026-09-12T10:00:00.000Z',
      });

      const result = await createClinicalFormTemplateAction({
        name: 'Bilan genou',
        kind: 'assessment',
        schemaJson: { fields: [{ id: 'score', label: 'Score', type: 'number', required: false }] },
      });

      expect(clinicalRecordService.createFormTemplate).toHaveBeenCalledWith(
        mockContext.organizationId,
        mockContext.practitionerId,
        expect.objectContaining({ name: 'Bilan genou' }),
      );
      expect(result.id).toBe('tpl-1');
    });

    it('createClinicalFormResponseAction creates draft response and revalidates path', async () => {
      vi.mocked(clinicalRecordService.createFormResponse).mockResolvedValue({
        id: 'resp-1',
        organizationId: mockContext.organizationId,
        templateId: 'tpl-1',
        templateName: 'Bilan genou',
        templateKind: 'assessment',
        patientId: 'pat-1',
        practitionerId: mockContext.practitionerId,
        careEpisodeId: null,
        encounterId: null,
        answersJson: { score: 10 },
        status: 'draft',
        finalizedAt: null,
        createdAt: '2026-09-12T10:00:00.000Z',
        updatedAt: '2026-09-12T10:00:00.000Z',
      });

      const result = await createClinicalFormResponseAction('pat-1', {
        templateId: 'tpl-1',
        answersJson: { score: 10 },
      });

      expect(clinicalRecordService.createFormResponse).toHaveBeenCalledWith(
        mockContext.organizationId,
        'pat-1',
        mockContext.practitionerId,
        expect.objectContaining({ templateId: 'tpl-1' }),
      );
      expect(result.status).toBe('draft');
    });

    it('finalizeClinicalFormResponseAction finalizes response', async () => {
      vi.mocked(clinicalRecordService.finalizeFormResponse).mockResolvedValue({
        id: 'resp-1',
        organizationId: mockContext.organizationId,
        templateId: 'tpl-1',
        templateName: 'Bilan genou',
        templateKind: 'assessment',
        patientId: 'pat-1',
        practitionerId: mockContext.practitionerId,
        careEpisodeId: null,
        encounterId: null,
        answersJson: { score: 10 },
        status: 'finalized',
        finalizedAt: '2026-09-12T10:00:00.000Z',
        createdAt: '2026-09-12T09:00:00.000Z',
        updatedAt: '2026-09-12T10:00:00.000Z',
      });

      const result = await finalizeClinicalFormResponseAction('pat-1', { responseId: 'resp-1' });

      expect(clinicalRecordService.finalizeFormResponse).toHaveBeenCalledWith(
        mockContext.organizationId,
        'pat-1',
        mockContext.practitionerId,
        'resp-1',
        undefined,
      );
      expect(result.status).toBe('finalized');
    });
  });

  describe('Measurement Actions', () => {
    it('createClinicalMeasurementAction validates and records measurement', async () => {
      vi.mocked(clinicalRecordService.createMeasurement).mockResolvedValue({
        id: 'm-1',
        organizationId: mockContext.organizationId,
        patientId: 'pat-1',
        practitionerId: mockContext.practitionerId,
        careEpisodeId: null,
        encounterId: null,
        code: 'pain_score',
        label: 'Douleur EVA',
        valueNumeric: 6,
        valueText: null,
        unit: '/10',
        observedAt: '2026-09-12T10:00:00.000Z',
        createdAt: '2026-09-12T10:00:00.000Z',
      });

      const result = await createClinicalMeasurementAction('pat-1', {
        code: 'pain_score',
        label: 'Douleur EVA',
        valueNumeric: 6,
        unit: '/10',
        observedAt: new Date().toISOString(),
      });

      expect(clinicalRecordService.createMeasurement).toHaveBeenCalledWith(
        mockContext.organizationId,
        'pat-1',
        mockContext.practitionerId,
        expect.objectContaining({ code: 'pain_score' }),
      );
      expect(result.id).toBe('m-1');
    });
  });
});
