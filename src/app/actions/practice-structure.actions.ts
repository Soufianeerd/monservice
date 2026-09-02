'use server';

import { requireProfessional } from '@/lib/auth/session';
import { practiceStructureService } from '@/lib/services/practice-structure.service';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces';
import { revalidatePath } from 'next/cache';
import { 
  practiceLocationCreateSchema,
  practiceLocationUpdateSchema,
  practicePractitionerCreateSchema,
  practicePractitionerUpdateSchema,
  practiceRoomCreateSchema,
  practiceRoomUpdateSchema,
  practiceResourceCreateSchema,
  practiceResourceUpdateSchema,
  practitionerLocationsSetSchema
} from '@/lib/practice-structure/validation';

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

export async function getPracticeStructureAction() {
  const { organizationId } = await requireParamedicalContext();
  return practiceStructureService.getOverview(organizationId);
}

// LOCATIONS
export async function createPracticeLocationAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practiceLocationCreateSchema.parse(data);
  const location = await practiceStructureService.createLocation(organizationId, validData);
  revalidatePath('/parametres/cabinet');
  return location;
}

export async function updatePracticeLocationAction(id: string, data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practiceLocationUpdateSchema.parse(data);
  const location = await practiceStructureService.updateLocation(organizationId, id, validData);
  revalidatePath('/parametres/cabinet');
  return location;
}

export async function setPrimaryPracticeLocationAction(id: string) {
  const { organizationId } = await requireParamedicalContext();
  await practiceStructureService.setPrimaryLocation(organizationId, id);
  revalidatePath('/parametres/cabinet');
}

export async function setPracticeLocationActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  await practiceStructureService.setLocationActive(organizationId, id, isActive);
  revalidatePath('/parametres/cabinet');
}

// PRACTITIONERS
export async function createPracticePractitionerAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practicePractitionerCreateSchema.parse(data);
  const practitioner = await practiceStructureService.createPractitioner(organizationId, validData);
  revalidatePath('/parametres/cabinet');
  return practitioner;
}

export async function updatePracticePractitionerAction(id: string, data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practicePractitionerUpdateSchema.parse(data);
  const practitioner = await practiceStructureService.updatePractitioner(organizationId, id, validData);
  revalidatePath('/parametres/cabinet');
  return practitioner;
}

export async function setPracticePractitionerActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  await practiceStructureService.setPractitionerActive(organizationId, id, isActive);
  revalidatePath('/parametres/cabinet');
}

export async function setPractitionerLocationsAction(practitionerId: string, assignments: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validAssignments = practitionerLocationsSetSchema.parse(assignments);
  await practiceStructureService.setPractitionerLocations(organizationId, practitionerId, validAssignments);
  revalidatePath('/parametres/cabinet');
}

// ROOMS
export async function createPracticeRoomAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practiceRoomCreateSchema.parse(data);
  const room = await practiceStructureService.createRoom(organizationId, validData);
  revalidatePath('/parametres/cabinet');
  return room;
}

export async function updatePracticeRoomAction(id: string, data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practiceRoomUpdateSchema.parse(data);
  const room = await practiceStructureService.updateRoom(organizationId, id, validData);
  revalidatePath('/parametres/cabinet');
  return room;
}

export async function setPracticeRoomActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  await practiceStructureService.setRoomActive(organizationId, id, isActive);
  revalidatePath('/parametres/cabinet');
}

// RESOURCES
export async function createPracticeResourceAction(data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practiceResourceCreateSchema.parse(data);
  const resource = await practiceStructureService.createResource(organizationId, validData);
  revalidatePath('/parametres/cabinet');
  return resource;
}

export async function updatePracticeResourceAction(id: string, data: unknown) {
  const { organizationId } = await requireParamedicalContext();
  const validData = practiceResourceUpdateSchema.parse(data);
  const resource = await practiceStructureService.updateResource(organizationId, id, validData);
  revalidatePath('/parametres/cabinet');
  return resource;
}

export async function setPracticeResourceActiveAction(id: string, isActive: boolean) {
  const { organizationId } = await requireParamedicalContext();
  await practiceStructureService.setResourceActive(organizationId, id, isActive);
  revalidatePath('/parametres/cabinet');
}
