'use server';

import { requireProfessional } from '@/lib/auth/session';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces';
import { revalidatePath } from 'next/cache';
import {
  patientCreateSchema,
  patientUpdateSchema,
  patientRepresentativeCreateSchema,
  patientRepresentativeUpdateSchema,
  patientRepresentativeLinkCreateSchema,
  patientRepresentativeLinkUpdateSchema,
  patientListFiltersSchema,
} from '@/lib/patients/validation';

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
  return { ...context, organization };
}

export async function listPatientsAction(rawFilters: unknown = {}) {
  const { organizationId } = await requireParamedicalContext();
  const filters = patientListFiltersSchema.parse(rawFilters);
  return patientRegistryService.listPatients(organizationId, filters);
}

export async function getPatientDetailAction(patientId: string) {
  const { organizationId } = await requireParamedicalContext();
  return patientRegistryService.getPatientDetail(organizationId, patientId);
}

export async function createPatientAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = patientCreateSchema.parse(data);
  const patient = await patientRegistryService.createPatient(organizationId, validData);
  revalidatePath('/patients');
  return patient;
}

export async function updatePatientAction(patientId: string, data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = patientUpdateSchema.parse(data);
  const patient = await patientRegistryService.updatePatient(organizationId, patientId, validData);
  revalidatePath('/patients');
  revalidatePath(`/patients/${patientId}`);
  return patient;
}

export async function setPatientActiveAction(patientId: string, active: boolean) {
  const { organizationId } = await requireParamedicalContext();
  const patient = await patientRegistryService.setPatientActive(organizationId, patientId, active);
  revalidatePath('/patients');
  revalidatePath(`/patients/${patientId}`);
  return patient;
}

export async function createRepresentativeAndLinkAction(
  patientId: string,
  representativeData: unknown,
  linkData: unknown
) {
  const { organizationId } = await requireParamedicalContext();
  const validRep = patientRepresentativeCreateSchema.parse(representativeData);
  const validLink = patientRepresentativeLinkCreateSchema.parse(linkData);
  const result = await patientRegistryService.createRepresentativeAndLink(
    organizationId,
    patientId,
    validRep,
    validLink
  );
  revalidatePath(`/patients/${patientId}`);
  return result;
}

export async function linkExistingRepresentativeAction(
  patientId: string,
  representativeId: string,
  linkData: unknown
) {
  const { organizationId } = await requireParamedicalContext();
  const validLink = patientRepresentativeLinkCreateSchema.parse(linkData);
  const result = await patientRegistryService.linkRepresentative(
    organizationId,
    patientId,
    representativeId,
    validLink
  );
  revalidatePath(`/patients/${patientId}`);
  return result;
}

export async function updateRepresentativeAction(representativeId: string, data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = patientRepresentativeUpdateSchema.parse(data);
  return patientRegistryService.updateRepresentative(organizationId, representativeId, validData);
}

export async function updateRepresentativeLinkAction(
  linkId: string,
  data: unknown,
  patientId?: string
) {
  const { organizationId } = await requireParamedicalContext();
  const validData = patientRepresentativeLinkUpdateSchema.parse(data);
  const result = await patientRegistryService.updateRepresentativeLink(
    organizationId,
    linkId,
    validData
  );
  if (patientId) {
    revalidatePath(`/patients/${patientId}`);
  }
  return result;
}

export async function setRepresentativeLinkActiveAction(
  linkId: string,
  active: boolean,
  patientId?: string
) {
  const { organizationId } = await requireParamedicalContext();
  const result = await patientRegistryService.setRepresentativeLinkActive(
    organizationId,
    linkId,
    active
  );
  if (patientId) {
    revalidatePath(`/patients/${patientId}`);
  }
  return result;
}
