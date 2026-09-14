import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assignQuestionnaireToPatientAction,
  savePatientQuestionnaireDraftAction,
  submitPatientQuestionnaireAction,
  getMyQuestionnairesAction,
} from '@/app/actions/patient-portal.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import type { PatientQuestionnaireAssignmentDTO } from '@/lib/patient-portal/types';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/patient-portal/auth', () => ({
  requirePatientPortalAccess: vi.fn(),
}));

vi.mock('@/lib/services/patient-portal.service', () => ({
  patientPortalService: {
    assignQuestionnaire: vi.fn(),
    saveQuestionnaireDraft: vi.fn(),
    submitQuestionnaire: vi.fn(),
    listQuestionnairesForPatient: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Patient Questionnaires Actions', () => {
  const mockPractitionerCtx = {
    userId: 'user-pro-1',
    organizationId: 'org-health-1',
    practitionerId: 'practitioner-1',
    email: 'pro@cabinet.fr',
  };

  const mockPatientCtx = {
    userId: 'user-pat-1',
    organizationId: 'org-health-1',
    patientId: 'pat-1',
    accessiblePatientIds: ['pat-1'],
    accessId: 'access-1',
    email: 'patient@email.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignQuestionnaireToPatientAction', () => {
    it('practitioner assigns questionnaire to patient', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPractitionerCtx);
      const mockResult: PatientQuestionnaireAssignmentDTO = {
        id: 'assign-1',
        organizationId: mockPractitionerCtx.organizationId,
        patientId: 'pat-1',
        templateId: 'tpl-1',
        templateTitle: 'Auto-évaluation douleur',
        templateCategory: 'intake',
        assignedByPractitionerId: mockPractitionerCtx.practitionerId,
        assignedByPractitionerName: 'Dr Martin',
        status: 'pending',
        draftAnswers: null,
        clinicalResponseId: null,
        schemaDefinition: { version: 1, fields: [] },
        dueAt: null,
        submittedAt: null,
        createdAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(patientPortalService.assignQuestionnaire).mockResolvedValue(mockResult);

      const res = await assignQuestionnaireToPatientAction('pat-1', {
        templateId: 'tpl-1',
      });

      expect(patientPortalService.assignQuestionnaire).toHaveBeenCalledWith(
        mockPractitionerCtx.organizationId,
        mockPractitionerCtx.practitionerId,
        {
          patientId: 'pat-1',
          templateId: 'tpl-1',
          careEpisodeId: null,
          dueAt: null,
        },
      );
      expect(res.status).toBe('pending');
    });
  });

  describe('savePatientQuestionnaireDraftAction', () => {
    it('patient saves intermediate draft', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      const mockResult: PatientQuestionnaireAssignmentDTO = {
        id: 'assign-1',
        organizationId: mockPatientCtx.organizationId,
        patientId: 'pat-1',
        templateId: 'tpl-1',
        templateTitle: 'Auto-évaluation douleur',
        templateCategory: 'intake',
        assignedByPractitionerId: 'practitioner-1',
        assignedByPractitionerName: 'Dr Martin',
        status: 'in_progress',
        draftAnswers: { eva_score: 5, notes: 'Douleur modérée' },
        clinicalResponseId: null,
        schemaDefinition: { version: 1, fields: [] },
        dueAt: null,
        submittedAt: null,
        createdAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(patientPortalService.saveQuestionnaireDraft).mockResolvedValue(mockResult);

      await savePatientQuestionnaireDraftAction({
        assignmentId: 'assign-1',
        answers: { eva_score: 5, notes: 'Douleur modérée' },
      });

      expect(patientPortalService.saveQuestionnaireDraft).toHaveBeenCalledWith(
        'assign-1',
        mockPatientCtx.accessiblePatientIds,
        { eva_score: 5, notes: 'Douleur modérée' },
      );
    });
  });

  describe('submitPatientQuestionnaireAction', () => {
    it('patient submits completed responses into clinical responses', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      const mockResult: PatientQuestionnaireAssignmentDTO = {
        id: 'assign-1',
        organizationId: mockPatientCtx.organizationId,
        patientId: 'pat-1',
        templateId: 'tpl-1',
        templateTitle: 'Auto-évaluation douleur',
        templateCategory: 'intake',
        assignedByPractitionerId: 'practitioner-1',
        assignedByPractitionerName: 'Dr Martin',
        status: 'completed',
        draftAnswers: { eva_score: 5, location: 'Genou droit' },
        clinicalResponseId: 'resp-1',
        schemaDefinition: { version: 1, fields: [] },
        dueAt: null,
        submittedAt: '2026-09-14T20:10:00.000Z',
        createdAt: '2026-09-14T20:00:00.000Z',
      };
      vi.mocked(patientPortalService.submitQuestionnaire).mockResolvedValue(mockResult);

      const res = await submitPatientQuestionnaireAction({
        assignmentId: 'assign-1',
        answers: { eva_score: 5, location: 'Genou droit' },
      });

      expect(patientPortalService.submitQuestionnaire).toHaveBeenCalledWith(
        'assign-1',
        mockPatientCtx.accessiblePatientIds,
        { eva_score: 5, location: 'Genou droit' },
      );
      expect(res.clinicalResponseId).toBe('resp-1');
    });
  });

  describe('getMyQuestionnairesAction', () => {
    it('lists all assigned questionnaires for authenticated patient', async () => {
      vi.mocked(requirePatientPortalAccess).mockResolvedValue(mockPatientCtx);
      vi.mocked(patientPortalService.listQuestionnairesForPatient).mockResolvedValue([]);

      await getMyQuestionnairesAction();

      expect(patientPortalService.listQuestionnairesForPatient).toHaveBeenCalledWith(
        mockPatientCtx.organizationId,
        mockPatientCtx.patientId,
      );
    });
  });
});
