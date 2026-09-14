import type { ClinicalFormAnswers, ClinicalFormKind, ClinicalFormTemplateSchema } from '@/lib/clinical/types';

export type PatientPortalAccessType = 'patient' | 'representative';

export interface PatientPortalAccessDTO {
  id: string;
  organizationId: string;
  patientId: string;
  userId: string;
  accessType: PatientPortalAccessType;
  representativeId: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  patientName?: string;
  organizationName?: string;
}

export interface PatientPortalAppointmentDTO {
  id: string;
  organizationId: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'scheduled' | 'cancelled' | 'no_show';
  appointmentTypeName: string;
  locationName: string;
  roomName?: string | null;
}

export interface PatientSharedDocumentDTO {
  id: string;
  organizationId: string;
  patientId: string;
  title: string;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type QuestionnaireStatus = 'assigned' | 'submitted' | 'cancelled';

export interface PatientQuestionnaireAssignmentDTO {
  id: string;
  organizationId: string;
  patientId: string;
  practitionerId: string;
  templateId: string;
  careEpisodeId: string | null;
  status: QuestionnaireStatus;
  answersJson: ClinicalFormAnswers;
  answers?: ClinicalFormAnswers;
  dueAt: string | null;
  submittedAt: string | null;
  clinicalResponseId: string | null;
  templateName?: string;
  templateKind?: ClinicalFormKind;
  templateDescription?: string;
  templateSchema?: ClinicalFormTemplateSchema;
  templateSchemaJson?: ClinicalFormTemplateSchema;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPortalOverviewDTO {
  patientId: string;
  organizationId: string;
  upcomingAppointmentsCount: number;
  pendingQuestionnairesCount: number;
  sharedDocumentsCount: number;
  recentMessagesCount: number;
  nextAppointment: PatientPortalAppointmentDTO | null;
}

export interface PatientPortalOverviewData {
  accessiblePatients: Array<{
    patientId: string;
    displayName: string;
    accessType: PatientPortalAccessType;
    organizationName: string;
  }>;
  upcomingAppointments: PatientPortalAppointmentDTO[];
  pendingQuestionnaires: PatientQuestionnaireAssignmentDTO[];
  sharedDocuments: PatientSharedDocumentDTO[];
  unpaidInvoicesCount: number;
  recentMessagesCount: number;
}
