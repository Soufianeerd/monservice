import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { db } from '@/lib/db/server';

vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ClinicalRecordService Unit Tests', () => {
  const orgId = 'org-kine-1';
  const patientId = 'patient-1';
  const practitionerId = 'practitioner-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCareEpisode', () => {
    it('creates active care episode when patient is active', async () => {
      // 1. Patient check query
      const mockPatientSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: true },
            ]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockPatientSelect);

      // 2. Insert query
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'ep-1',
              organizationId: orgId,
              patientId,
              practitionerId,
              title: 'Rééducation épaule',
              status: 'active',
              startedAt: new Date().toISOString(),
              closedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await clinicalRecordService.createCareEpisode(
        orgId,
        patientId,
        practitionerId,
        { title: '  Rééducation épaule  ' },
      );

      expect(result.id).toBe('ep-1');
      expect(result.status).toBe('active');
      expect(result.title).toBe('Rééducation épaule');
    });

    it('rejects creation when patient is inactive', async () => {
      const mockPatientSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: false },
            ]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockPatientSelect);

      await expect(
        clinicalRecordService.createCareEpisode(orgId, patientId, practitionerId, {
          title: 'Test',
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'PATIENT_INACTIVE',
        }),
      );
    });
  });

  describe('closeCareEpisode', () => {
    it('rejects closing care episode when draft notes exist under its encounters', async () => {
      // 1. Patient check
      const mockSelect = vi.fn();
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: true },
            ]),
          }),
        }),
      });

      // 2. Episode lookup
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'ep-1', status: 'active' }]),
          }),
        }),
      });

      // 3. Draft notes check: returns 1 draft note
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 'note-draft-1' }]),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.closeCareEpisode(orgId, patientId, practitionerId, 'ep-1'),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'CARE_EPISODE_HAS_DRAFT_NOTES',
        }),
      );
    });

    it('closes care episode successfully when no draft notes exist', async () => {
      const mockSelect = vi.fn();
      // Patient check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: true },
            ]),
          }),
        }),
      });
      // Episode lookup
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'ep-1', status: 'active' }]),
          }),
        }),
      });
      // Draft notes check: none
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      // Update mock
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'ep-1',
                organizationId: orgId,
                patientId,
                practitionerId,
                title: 'Épisode terminé',
                status: 'closed',
                startedAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await clinicalRecordService.closeCareEpisode(
        orgId,
        patientId,
        practitionerId,
        'ep-1',
      );

      expect(result.status).toBe('closed');
      expect(result.closedAt).not.toBeNull();
    });
  });

  describe('createClinicalEncounter', () => {
    it('rejects encounter creation on closed care episode', async () => {
      const mockSelect = vi.fn();
      // Patient check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: true },
            ]),
          }),
        }),
      });
      // Episode check: closed
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'ep-closed', status: 'closed' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.createClinicalEncounter(orgId, patientId, practitionerId, {
          careEpisodeId: 'ep-closed',
          occurredAt: new Date(Date.now() - 3600000).toISOString(),
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'CARE_EPISODE_CLOSED',
        }),
      );
    });

    it('rejects encounter with future occurredAt date', async () => {
      const mockSelect = vi.fn();
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: true },
            ]),
          }),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'ep-active', status: 'active' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await expect(
        clinicalRecordService.createClinicalEncounter(orgId, patientId, practitionerId, {
          careEpisodeId: 'ep-active',
          occurredAt: futureDate,
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'FUTURE_CLINICAL_ENCOUNTER',
        }),
      );
    });
  });

  describe('clinical notes lifecycle and immutability', () => {
    it('creates draft clinical note on active care episode encounter', async () => {
      const mockSelect = vi.fn();
      // Patient check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: patientId, organizationId: orgId, isActive: true },
            ]),
          }),
        }),
      });
      // Encounter & episode check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { id: 'enc-1', careEpisodeId: 'ep-1', episodeStatus: 'active' },
              ]),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'note-1',
              organizationId: orgId,
              encounterId: 'enc-1',
              patientId,
              authorPractitionerId: practitionerId,
              content: 'Observation début',
              status: 'draft',
              finalizedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const note = await clinicalRecordService.createClinicalNote(
        orgId,
        patientId,
        practitionerId,
        {
          encounterId: 'enc-1',
          content: 'Observation début',
        },
      );

      expect(note.status).toBe('draft');
      expect(note.finalizedAt).toBeNull();
    });

    it('rejects updating a finalized clinical note', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 'note-finalized-1', status: 'finalized' },
            ]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.updateDraftClinicalNote(
          orgId,
          patientId,
          practitionerId,
          'note-finalized-1',
          'Nouvelle tentative de modification',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'CLINICAL_NOTE_FINALIZED',
        }),
      );
    });

    it('finalizes a draft clinical note permanently', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'note-draft-1', status: 'draft' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'note-draft-1',
                organizationId: orgId,
                encounterId: 'enc-1',
                patientId,
                authorPractitionerId: practitionerId,
                content: 'Observation validée',
                status: 'finalized',
                finalizedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const finalized = await clinicalRecordService.finalizeClinicalNote(
        orgId,
        patientId,
        practitionerId,
        'note-draft-1',
      );

      expect(finalized.status).toBe('finalized');
      expect(finalized.finalizedAt).not.toBeNull();
    });
  });

  describe('validateClinicalContextLinks (Session 12B Coherence)', () => {
    it('succeeds when careEpisode and encounter match correctly', async () => {
      const mockSelect = vi.fn();
      // Episode lookup
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'ep-1' }]),
          }),
        }),
      });
      // Encounter lookup: returns careEpisodeId = 'ep-1'
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'enc-1', careEpisodeId: 'ep-1' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.validateClinicalContextLinks(
          orgId,
          patientId,
          practitionerId,
          'ep-1',
          'enc-1',
        ),
      ).resolves.toBeUndefined();
    });

    it('rejects with CLINICAL_CONTEXT_MISMATCH when encounter belongs to another care episode', async () => {
      const mockSelect = vi.fn();
      // Episode lookup
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'ep-1' }]),
          }),
        }),
      });
      // Encounter lookup: returns careEpisodeId = 'ep-2' (different!)
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'enc-1', careEpisodeId: 'ep-2' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.validateClinicalContextLinks(
          orgId,
          patientId,
          practitionerId,
          'ep-1',
          'enc-1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'CLINICAL_CONTEXT_MISMATCH',
        }),
      );
    });

    it('rejects when care episode does not exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.validateClinicalContextLinks(
          orgId,
          patientId,
          practitionerId,
          'ep-nonexistent',
          null,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'EPISODE_NOT_FOUND',
        }),
      );
    });

    it('rejects when encounter does not exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        clinicalRecordService.validateClinicalContextLinks(
          orgId,
          patientId,
          practitionerId,
          null,
          'enc-nonexistent',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'ENCOUNTER_NOT_FOUND',
        }),
      );
    });
  });
});
