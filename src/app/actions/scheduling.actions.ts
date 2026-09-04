'use server';

import { requireProfessional } from '@/lib/auth/session';
import { schedulingService } from '@/lib/services/scheduling.service';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces';
import { revalidatePath } from 'next/cache';
import {
  appointmentTypeCreateSchema,
  appointmentTypeUpdateSchema,
  availabilityRuleCreateSchema,
  availabilityRuleUpdateSchema,
  availabilityExceptionCreateSchema,
  availabilityExceptionUpdateSchema,
  appointmentCreateSchema,
  appointmentRescheduleSchema,
  appointmentCalendarRangeSchema,
  patientSearchSchema,
} from '@/lib/scheduling/validation';

async function requireParamedicalContext() {
  const context = await requireProfessional();
  if (!context.organizationId) {
    throw new Error('Organization introuvable');
  }
  const organization = await organizationService.getById(context.organizationId);
  if (!organization) {
    throw new Error('Organization introuvable');
  }
  const workspace = resolveWorkspace({
    sector: organization.sector,
    profession: organization.profession,
    country: organization.country,
  });
  if (workspace.type !== 'paramedical') {
    throw new Error('Cette action est réservée au workspace paramédical');
  }
  return { ...context, organizationId: context.organizationId, userId: context.userId, organization };
}

// ==========================================
// BOOTSTRAP & SEARCH
// ==========================================
export async function getSchedulingBootstrapAction() {
  const { organizationId } = await requireParamedicalContext();
  return schedulingService.getSchedulingBootstrap(organizationId);
}

export async function searchPatientsAction(query: string, limit: number = 10) {
  const { organizationId } = await requireParamedicalContext();
  const valid = patientSearchSchema.parse({ query, limit });
  return schedulingService.searchPatients(organizationId, valid.query, valid.limit);
}

// ==========================================
// APPOINTMENT TYPES
// ==========================================
export async function listAppointmentTypesAction() {
  const { organizationId } = await requireParamedicalContext();
  return schedulingService.listAppointmentTypes(organizationId);
}

export async function createAppointmentTypeAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = appointmentTypeCreateSchema.parse(data);
  const result = await schedulingService.createAppointmentType(organizationId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/types-seances');
  return result;
}

export async function updateAppointmentTypeAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = appointmentTypeUpdateSchema.parse(data);
  const result = await schedulingService.updateAppointmentType(organizationId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/types-seances');
  return result;
}

export async function setAppointmentTypeActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  const result = await schedulingService.setAppointmentTypeActive(organizationId, id, isActive);
  revalidatePath('/agenda');
  revalidatePath('/agenda/types-seances');
  return result;
}

// ==========================================
// AVAILABILITY RULES & EXCEPTIONS
// ==========================================
export async function listAvailabilityAction(practitionerId?: string, locationId?: string) {
  const { organizationId } = await requireParamedicalContext();
  const [rules, exceptions] = await Promise.all([
    schedulingService.listAvailabilityRules(organizationId, practitionerId, locationId),
    schedulingService.listAvailabilityExceptions(organizationId, practitionerId, locationId),
  ]);
  return { rules, exceptions };
}

export async function createAvailabilityRuleAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = availabilityRuleCreateSchema.parse(data);
  const result = await schedulingService.createAvailabilityRule(organizationId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/disponibilites');
  return result;
}

export async function updateAvailabilityRuleAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = availabilityRuleUpdateSchema.parse(data);
  const result = await schedulingService.updateAvailabilityRule(organizationId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/disponibilites');
  return result;
}

export async function setAvailabilityRuleActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  const result = await schedulingService.setAvailabilityRuleActive(organizationId, id, isActive);
  revalidatePath('/agenda');
  revalidatePath('/agenda/disponibilites');
  return result;
}

export async function createAvailabilityExceptionAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = availabilityExceptionCreateSchema.parse(data);
  const result = await schedulingService.createAvailabilityException(organizationId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/disponibilites');
  return result;
}

export async function updateAvailabilityExceptionAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = availabilityExceptionUpdateSchema.parse(data);
  const result = await schedulingService.updateAvailabilityException(organizationId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/disponibilites');
  return result;
}

export async function setAvailabilityExceptionActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  const result = await schedulingService.setAvailabilityExceptionActive(organizationId, id, isActive);
  revalidatePath('/agenda');
  revalidatePath('/agenda/disponibilites');
  return result;
}

// ==========================================
// APPOINTMENTS
// ==========================================
export async function listAppointmentsForCalendarAction(params: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validParams = appointmentCalendarRangeSchema.parse(params);
  return schedulingService.listAppointmentsForCalendar(organizationId, validParams);
}

export async function getAppointmentByIdAction(id: string) {
  const { organizationId } = await requireParamedicalContext();
  return schedulingService.getAppointmentById(organizationId, id);
}

export async function createAppointmentAction(data: unknown) {
  const { organizationId, userId } = await requireParamedicalContext();
  const validData = appointmentCreateSchema.parse(data);
  const result = await schedulingService.createAppointment(organizationId, userId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/calendrier');
  return result;
}

export async function rescheduleAppointmentAction(data: unknown) {
  const { organizationId, userId } = await requireParamedicalContext();
  const validData = appointmentRescheduleSchema.parse(data);
  const result = await schedulingService.rescheduleAppointment(organizationId, userId, validData);
  revalidatePath('/agenda');
  revalidatePath('/agenda/calendrier');
  return result;
}
