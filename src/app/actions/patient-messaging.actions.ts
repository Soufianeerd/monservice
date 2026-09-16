'use server';

import { revalidatePath } from 'next/cache';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientMessagingService } from '@/lib/services/patient-messaging.service';
import {
  sendPatientPortalMessageSchema,
  sendPractitionerPatientMessageSchema,
} from '@/lib/patient-messaging/validation';
import type { PatientPortalMessageDTO } from '@/lib/patient-messaging/types';

export async function sendPatientPortalMessageAction(
  patientId: string,
  practitionerId: string,
  content: string,
): Promise<PatientPortalMessageDTO> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  const input = sendPatientPortalMessageSchema.parse({
    patientId: portalCtx.patientId,
    practitionerId,
    content,
  });

  const message = await patientMessagingService.sendPatientMessage(portalCtx.userId, input);
  revalidatePath('/client/sante/messages');
  return message;
}

export async function sendPractitionerPatientMessageAction(
  patientId: string,
  portalUserId: string,
  content: string,
): Promise<PatientPortalMessageDTO> {
  const { organizationId, practitionerId, userId } = await requireClinicalPractitionerContext();
  const input = sendPractitionerPatientMessageSchema.parse({
    patientId,
    portalUserId,
    content,
  });

  const message = await patientMessagingService.sendPractitionerMessage(
    organizationId,
    practitionerId,
    userId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/messages`);
  return message;
}

export async function listPatientPortalMessagesAction(
  patientId?: string,
): Promise<PatientPortalMessageDTO[]> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientMessagingService.listPatientMessagesForPortal(
    portalCtx.userId,
    portalCtx.patientId,
  );
}

export async function listPractitionerPatientMessagesAction(
  patientId: string,
): Promise<PatientPortalMessageDTO[]> {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  return patientMessagingService.listPatientMessagesForPractitioner(
    organizationId,
    practitionerId,
    patientId,
  );
}

export async function markPatientMessagesAsReadAction(
  patientId: string,
): Promise<{ success: boolean }> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  await patientMessagingService.markMessagesAsRead(portalCtx.patientId, portalCtx.userId);
  return { success: true };
}
