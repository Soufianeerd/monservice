'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import {
  grantPatientPortalAccessSchema,
  revokePatientPortalAccessSchema,
  assignQuestionnaireSchema,
  saveQuestionnaireDraftSchema,
  submitQuestionnaireSchema,
} from '@/lib/patient-portal/validation';
import type {
  PatientPortalAccessDTO,
  PatientPortalAppointmentDTO,
  PatientSharedDocumentDTO,
  PatientQuestionnaireAssignmentDTO,
  PatientPortalOverviewDTO,
} from '@/lib/patient-portal/types';

// ==========================================
// PRACTITIONER ACTIONS (PORTAL MANAGEMENT)
// ==========================================

export async function grantPatientPortalAccessAction(
  patientId: string,
  rawInput: unknown,
): Promise<PatientPortalAccessDTO> {
  const { organizationId, practitionerId, userId } = await requireClinicalPractitionerContext();
  const input = grantPatientPortalAccessSchema.parse({
    ...(typeof rawInput === 'object' && rawInput !== null ? rawInput : {}),
    patientId,
  });

  const access = await patientPortalService.grantPortalAccess(
    organizationId,
    practitionerId,
    userId,
    {
      patientId,
      email: input.email,
      representativeId: input.representativeId || null,
    },
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/portail`);
  return access;
}

export async function revokePatientPortalAccessAction(
  patientId: string,
  rawInput: unknown,
): Promise<PatientPortalAccessDTO> {
  const { organizationId } = await requireClinicalPractitionerContext();
  const { accessId } = revokePatientPortalAccessSchema.parse(rawInput);

  const revoked = await patientPortalService.revokePortalAccess(organizationId, accessId);

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/portail`);
  return revoked;
}

export async function listPatientPortalAccessAction(
  patientId: string,
): Promise<PatientPortalAccessDTO[]> {
  const { organizationId } = await requireClinicalPractitionerContext();
  return patientPortalService.listPortalAccessesForPatient(organizationId, patientId);
}

export async function assignQuestionnaireToPatientAction(
  patientId: string,
  rawInput: unknown,
): Promise<PatientQuestionnaireAssignmentDTO> {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = assignQuestionnaireSchema.parse({
    ...(typeof rawInput === 'object' && rawInput !== null ? rawInput : {}),
    patientId,
  });

  const assignment = await patientPortalService.assignQuestionnaire(
    organizationId,
    practitionerId,
    {
      patientId,
      templateId: input.templateId,
      careEpisodeId: input.careEpisodeId || null,
      dueAt: input.dueAt || null,
    },
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/questionnaires`);
  return assignment;
}

export async function listPatientQuestionnairesAction(
  patientId: string,
): Promise<PatientQuestionnaireAssignmentDTO[]> {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  return patientPortalService.listQuestionnairesForPractitioner(
    organizationId,
    practitionerId,
    patientId,
  );
}

// ==========================================
// PATIENT / REPRESENTATIVE PORTAL ACTIONS
// ==========================================

export async function listMyPatientPortalAccessAction(): Promise<PatientPortalAccessDTO[]> {
  const session = await requireSession();
  return patientPortalService.listPortalAccessesForUser(session.userId);
}

export async function getMyPatientAppointmentsAction(
  patientId?: string,
): Promise<PatientPortalAppointmentDTO[]> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientPortalService.getPatientAppointmentsForPortal(
    portalCtx.organizationId,
    portalCtx.patientId,
  );
}

export async function getMySharedDocumentsAction(
  patientId?: string,
): Promise<PatientSharedDocumentDTO[]> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientPortalService.getSharedDocumentsForPortal(
    portalCtx.organizationId,
    portalCtx.patientId,
  );
}

export async function getPatientSharedDocumentDownloadUrlAction(
  documentId: string,
  patientId?: string,
): Promise<{ downloadUrl: string; fileName: string; mimeType: string; sizeBytes: number }> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientPortalService.getSharedDocumentDownloadUrl(
    portalCtx.organizationId,
    portalCtx.patientId,
    documentId,
  );
}

export async function getMyQuestionnairesAction(
  patientId?: string,
): Promise<PatientQuestionnaireAssignmentDTO[]> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientPortalService.listQuestionnairesForPatient(
    portalCtx.organizationId,
    portalCtx.patientId,
  );
}

export async function savePatientQuestionnaireDraftAction(
  rawInput: unknown,
  patientId?: string,
): Promise<PatientQuestionnaireAssignmentDTO> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  const input = saveQuestionnaireDraftSchema.parse(rawInput);

  const saved = await patientPortalService.saveQuestionnaireDraft(
    input.assignmentId,
    portalCtx.accessiblePatientIds,
    input.answers,
  );

  revalidatePath('/client/sante/questionnaires');
  return saved;
}

export async function submitPatientQuestionnaireAction(
  rawInput: unknown,
  patientId?: string,
): Promise<{ assignment: PatientQuestionnaireAssignmentDTO; clinicalResponseId: string }> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  const input = submitQuestionnaireSchema.parse(rawInput);

  const assignment = await patientPortalService.submitQuestionnaire(
    input.assignmentId,
    portalCtx.accessiblePatientIds,
    input.answers,
  );

  revalidatePath('/client/sante/questionnaires');
  return {
    assignment,
    clinicalResponseId: assignment.clinicalResponseId || '',
  };
}

export async function getPatientPortalOverviewAction(
  patientId?: string,
): Promise<PatientPortalOverviewDTO> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientPortalService.getPatientPortalOverview(
    portalCtx.organizationId,
    portalCtx.patientId,
    portalCtx.userId,
  );
}
