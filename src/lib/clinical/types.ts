export const CARE_EPISODE_STATUSES = ['active', 'closed'] as const;
export type CareEpisodeStatus = (typeof CARE_EPISODE_STATUSES)[number];

export const CLINICAL_NOTE_STATUSES = ['draft', 'finalized'] as const;
export type ClinicalNoteStatus = (typeof CLINICAL_NOTE_STATUSES)[number];

export const CLINICAL_DOCUMENT_CATEGORIES = [
  'report',
  'assessment',
  'prescription',
  'referral',
  'result',
  'consent',
  'correspondence',
  'administrative',
  'other',
] as const;
export type ClinicalDocumentCategory = (typeof CLINICAL_DOCUMENT_CATEGORIES)[number];

export const CLINICAL_DOCUMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type ClinicalDocumentAllowedMimeType = (typeof CLINICAL_DOCUMENT_ALLOWED_MIME_TYPES)[number];

export const CLINICAL_FORM_KINDS = [
  'assessment',
  'questionnaire',
  'intake',
  'follow_up',
  'outcome',
  'other',
] as const;
export type ClinicalFormKind = (typeof CLINICAL_FORM_KINDS)[number];

export const CLINICAL_FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'boolean',
  'single_choice',
  'multiple_choice',
  'date',
  'scale',
] as const;
export type ClinicalFormFieldType = (typeof CLINICAL_FORM_FIELD_TYPES)[number];

export const CLINICAL_FORM_RESPONSE_STATUSES = ['draft', 'finalized'] as const;
export type ClinicalFormResponseStatus = (typeof CLINICAL_FORM_RESPONSE_STATUSES)[number];

// ==========================================
// FORM SCHEMA DEFINITIONS
// ==========================================

export interface ClinicalFormFieldOption {
  value: string;
  label: string;
}

export interface ClinicalFormFieldDefinition {
  id: string;
  type: ClinicalFormFieldType;
  label: string;
  description?: string;
  required: boolean;
  options?: ClinicalFormFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
}

export interface ClinicalFormTemplateSchema {
  fields: ClinicalFormFieldDefinition[];
}

export type ClinicalFormAnswers = Record<string, string | number | boolean | string[] | null | undefined>;

// ==========================================
// DATA TRANSFER OBJECTS (DTOs)
// ==========================================

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

export interface ClinicalDocumentDTO {
  id: string;
  organizationId: string;
  patientId: string;
  practitionerId: string;
  careEpisodeId: string | null;
  encounterId: string | null;
  title: string;
  category: ClinicalDocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  patientVisible: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalFormTemplateDTO {
  id: string;
  organizationId: string;
  practitionerId: string;
  name: string;
  kind: ClinicalFormKind;
  description: string | null;
  schemaJson: ClinicalFormTemplateSchema;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalFormResponseDTO {
  id: string;
  organizationId: string;
  templateId: string;
  templateName?: string;
  templateKind?: ClinicalFormKind;
  patientId: string;
  practitionerId: string;
  careEpisodeId: string | null;
  encounterId: string | null;
  answersJson: ClinicalFormAnswers;
  status: ClinicalFormResponseStatus;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalMeasurementDTO {
  id: string;
  organizationId: string;
  patientId: string;
  practitionerId: string;
  careEpisodeId: string | null;
  encounterId: string | null;
  code: string;
  label: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  observedAt: string;
  createdAt: string;
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

// ==========================================
// UNIFIED TIMELINE DTO
// ==========================================

export type ClinicalTimelineItem =
  | {
      type: 'episode_opened';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      episodeId?: string;
      practitionerId: string;
    }
  | {
      type: 'episode_closed';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      episodeId?: string;
      practitionerId: string;
    }
  | {
      type: 'encounter';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      episodeId?: string;
      appointmentId?: string | null;
      practitionerId: string;
    }
  | {
      type: 'note';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      episodeId?: string | null;
      encounterId?: string;
      contentSnippet?: string;
      status: ClinicalNoteStatus;
      finalizedAt?: string | null;
      practitionerId: string;
    }
  | {
      type: 'document';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      category: ClinicalDocumentCategory;
      fileName: string;
      mimeType?: string;
      sizeBytes: number;
      isArchived?: boolean;
      episodeId?: string | null;
      encounterId?: string | null;
      practitionerId: string;
    }
  | {
      type: 'form_response';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      templateId?: string;
      templateName?: string;
      templateKind?: ClinicalFormKind;
      status: ClinicalFormResponseStatus;
      finalizedAt?: string | null;
      episodeId?: string | null;
      encounterId?: string | null;
      practitionerId: string;
    }
  | {
      type: 'measurement';
      id: string;
      timestamp: string;
      title: string;
      subtitle?: string;
      snippet?: string;
      code: string;
      label: string;
      valueNumeric?: number | null;
      valueText?: string | null;
      unit?: string | null;
      episodeId?: string | null;
      encounterId?: string | null;
      practitionerId: string;
    };

// ==========================================
// INPUT INTERFACES
// ==========================================

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

export interface CreateClinicalDocumentMetadataInput {
  id?: string;
  careEpisodeId?: string | null;
  encounterId?: string | null;
  title: string;
  category: ClinicalDocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  patientVisible?: boolean;
}

export interface UpdateClinicalDocumentInput {
  title?: string;
  category?: ClinicalDocumentCategory;
  patientVisible?: boolean;
  isArchived?: boolean;
}

export interface CreateClinicalFormTemplateInput {
  name: string;
  kind: ClinicalFormKind;
  description?: string | null;
  schemaJson: ClinicalFormTemplateSchema;
}

export interface UpdateClinicalFormTemplateInput {
  name?: string;
  kind?: ClinicalFormKind;
  description?: string | null;
  schemaJson?: ClinicalFormTemplateSchema;
  isActive?: boolean;
}

export interface CreateClinicalFormResponseInput {
  templateId: string;
  careEpisodeId?: string | null;
  encounterId?: string | null;
  answersJson: ClinicalFormAnswers;
}

export interface UpdateDraftClinicalFormResponseInput {
  answersJson: ClinicalFormAnswers;
  careEpisodeId?: string | null;
  encounterId?: string | null;
}

export interface CreateClinicalMeasurementInput {
  careEpisodeId?: string | null;
  encounterId?: string | null;
  code: string;
  label: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  unit?: string | null;
  observedAt: string;
}
