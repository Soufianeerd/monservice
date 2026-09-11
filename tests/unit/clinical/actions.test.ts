import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCareEpisodeAction,
  closeCareEpisodeAction,
  createClinicalEncounterAction,
  createClinicalNoteAction,
  updateDraftClinicalNoteAction,
  finalizeClinicalNoteAction,
} from '@/app/actions/clinical-record.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { revalidatePath } from 'next/cache';
import type { CareEpisodeDTO, ClinicalEncounterDTO, ClinicalNoteDTO } from '@/lib/clinical/types';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/services/clinical-record.service', () => ({
  clinicalRecordService: {
    createCareEpisode: vi.fn(),
    closeCareEpisode: vi.fn(),
    createClinicalEncounter: vi.fn(),
    createClinicalNote: vi.fn(),
    updateDraftClinicalNote: vi.fn(),
    finalizeClinicalNote: vi.fn(),
    listEligibleAppointmentsForEncounter: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Clinical Record Server Actions', () => {
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

  it('createCareEpisodeAction enforces context organization and practitioner authority', async () => {
    const mockCreatedEpisode: CareEpisodeDTO = {
      id: 'ep-1',
      organizationId: mockContext.organizationId,
      patientId: 'patient-1',
      practitionerId: mockContext.practitionerId,
      title: 'Suivi genou',
      status: 'active',
      startedAt: '2026-09-10T10:00:00.000Z',
      closedAt: null,
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    };
    vi.mocked(clinicalRecordService.createCareEpisode).mockResolvedValue(mockCreatedEpisode);

    // Client passes hostile payload with forged org and practitioner
    const hostileInput = {
      title: 'Suivi genou',
      organizationId: 'forged-org',
      practitionerId: 'forged-practitioner',
    };

    const result = await createCareEpisodeAction('patient-1', hostileInput);

    expect(clinicalRecordService.createCareEpisode).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
      { title: 'Suivi genou' },
    );
    expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-1');
    expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-1/clinique');
    expect(result.id).toBe('ep-1');
  });

  it('createClinicalEncounterAction ignores forged authority from payload', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const mockCreatedEncounter: ClinicalEncounterDTO = {
      id: 'enc-1',
      organizationId: mockContext.organizationId,
      careEpisodeId: 'ep-1',
      patientId: 'patient-1',
      practitionerId: mockContext.practitionerId,
      appointmentId: null,
      occurredAt: pastDate,
      createdAt: pastDate,
      updatedAt: pastDate,
    };
    vi.mocked(clinicalRecordService.createClinicalEncounter).mockResolvedValue(mockCreatedEncounter);

    const hostileInput = {
      careEpisodeId: 'ep-1',
      occurredAt: pastDate,
      practitionerId: 'forged-practitioner',
    };

    const result = await createClinicalEncounterAction('patient-1', hostileInput);

    expect(clinicalRecordService.createClinicalEncounter).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
      { careEpisodeId: 'ep-1', occurredAt: pastDate, appointmentId: null },
    );
    expect(result.id).toBe('enc-1');
  });

  it('createClinicalNoteAction uses server author practitioner and validates content', async () => {
    const mockCreatedNote: ClinicalNoteDTO = {
      id: 'note-1',
      organizationId: mockContext.organizationId,
      encounterId: 'enc-1',
      patientId: 'patient-1',
      authorPractitionerId: mockContext.practitionerId,
      content: 'Note de séance',
      status: 'draft',
      finalizedAt: null,
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:00:00.000Z',
    };
    vi.mocked(clinicalRecordService.createClinicalNote).mockResolvedValue(mockCreatedNote);

    const input = {
      encounterId: 'enc-1',
      content: 'Note de séance',
      authorPractitionerId: 'attacker-id',
    };

    const result = await createClinicalNoteAction('patient-1', input);

    expect(clinicalRecordService.createClinicalNote).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
      { encounterId: 'enc-1', content: 'Note de séance' },
    );
    expect(result.id).toBe('note-1');
  });

  it('closeCareEpisodeAction closes episode with context authority', async () => {
    const mockClosedEpisode: CareEpisodeDTO = {
      id: 'ep-1',
      organizationId: mockContext.organizationId,
      patientId: 'patient-1',
      practitionerId: mockContext.practitionerId,
      title: 'Suivi genou',
      status: 'closed',
      startedAt: '2026-09-10T10:00:00.000Z',
      closedAt: '2026-09-10T12:00:00.000Z',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    };
    vi.mocked(clinicalRecordService.closeCareEpisode).mockResolvedValue(mockClosedEpisode);

    const result = await closeCareEpisodeAction('patient-1', { episodeId: 'ep-1' });

    expect(clinicalRecordService.closeCareEpisode).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
      'ep-1',
    );
    expect(result.status).toBe('closed');
  });

  it('updateDraftClinicalNoteAction updates draft note with context authority', async () => {
    const mockUpdatedNote: ClinicalNoteDTO = {
      id: 'note-1',
      organizationId: mockContext.organizationId,
      encounterId: 'enc-1',
      patientId: 'patient-1',
      authorPractitionerId: mockContext.practitionerId,
      content: 'Contenu mis à jour',
      status: 'draft',
      finalizedAt: null,
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T10:30:00.000Z',
    };
    vi.mocked(clinicalRecordService.updateDraftClinicalNote).mockResolvedValue(mockUpdatedNote);

    const result = await updateDraftClinicalNoteAction(
      'patient-1',
      'note-1',
      { content: 'Contenu mis à jour' },
    );

    expect(clinicalRecordService.updateDraftClinicalNote).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
      'note-1',
      'Contenu mis à jour',
    );
    expect(result.content).toBe('Contenu mis à jour');
  });

  it('finalizeClinicalNoteAction calls service with context authority', async () => {
    const mockFinalizedNote: ClinicalNoteDTO = {
      id: 'note-1',
      organizationId: mockContext.organizationId,
      encounterId: 'enc-1',
      patientId: 'patient-1',
      authorPractitionerId: mockContext.practitionerId,
      content: 'Note de séance',
      status: 'finalized',
      finalizedAt: '2026-09-10T11:00:00.000Z',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-10T11:00:00.000Z',
    };
    vi.mocked(clinicalRecordService.finalizeClinicalNote).mockResolvedValue(mockFinalizedNote);

    const result = await finalizeClinicalNoteAction('patient-1', { noteId: 'note-1' });

    expect(clinicalRecordService.finalizeClinicalNote).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
      'note-1',
    );
    expect(result.status).toBe('finalized');
  });
});
