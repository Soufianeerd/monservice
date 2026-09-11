export const CARE_EPISODE_STATUSES = ['active', 'closed'] as const;
export type CareEpisodeStatus = (typeof CARE_EPISODE_STATUSES)[number];

export const CLINICAL_NOTE_STATUSES = ['draft', 'finalized'] as const;
export type ClinicalNoteStatus = (typeof CLINICAL_NOTE_STATUSES)[number];

export interface CareEpisodeDTO {
  id: string;
  organizationId: string;
  patientId: string;
  practitionerId: string;
  title: string | null;
  status: CareEpisodeStatus;
  startedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalEncounterDTO {
  id: string;
  organizationId: string;
  careEpisodeId: string;
  patientId: string;
  practitionerId: string;
  appointmentId: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalNoteDTO {
  id: string;
  organizationId: string;
  encounterId: string;
  patientId: string;
  authorPractitionerId: string;
  content: string;
  status: ClinicalNoteStatus;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalEncounterWithNotesDTO extends ClinicalEncounterDTO {
  notes: ClinicalNoteDTO[];
}

export interface CareEpisodeDetailDTO extends CareEpisodeDTO {
  encounters: ClinicalEncounterWithNotesDTO[];
}

export interface ClinicalRecordDTO {
  episodes: CareEpisodeDetailDTO[];
}

export interface CreateCareEpisodeInput {
  title?: string | null;
}

export interface CreateClinicalEncounterInput {
  careEpisodeId: string;
  occurredAt: string;
  appointmentId?: string | null;
}

export interface CreateClinicalNoteInput {
  encounterId: string;
  content: string;
}

export interface UpdateDraftClinicalNoteInput {
  content: string;
}

export interface EligibleAppointmentDTO {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  appointmentTypeId: string;
  appointmentTypeName: string;
}
