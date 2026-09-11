'use server';

import { revalidatePath } from 'next/cache';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import {
  createCareEpisodeSchema,
  createClinicalEncounterSchema,
  createClinicalNoteSchema,
  updateDraftClinicalNoteSchema,
  closeCareEpisodeSchema,
  finalizeClinicalNoteSchema,
} from '@/lib/clinical/validation';

export async function createCareEpisodeAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = createCareEpisodeSchema.parse(rawInput);

  const episode = await clinicalRecordService.createCareEpisode(
    organizationId,
    patientId,
    practitionerId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return episode;
}

export async function closeCareEpisodeAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const { episodeId } = closeCareEpisodeSchema.parse(
    typeof rawInput === 'string' ? { episodeId: rawInput } : rawInput,
  );

  const episode = await clinicalRecordService.closeCareEpisode(
    organizationId,
    patientId,
    practitionerId,
    episodeId,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return episode;
}

export async function createClinicalEncounterAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = createClinicalEncounterSchema.parse(rawInput);

  const encounter = await clinicalRecordService.createClinicalEncounter(
    organizationId,
    patientId,
    practitionerId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return encounter;
}

export async function createClinicalNoteAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = createClinicalNoteSchema.parse(rawInput);

  const note = await clinicalRecordService.createClinicalNote(
    organizationId,
    patientId,
    practitionerId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return note;
}

export async function updateDraftClinicalNoteAction(
  patientId: string,
  noteId: string,
  rawInput: unknown,
) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const { content } = updateDraftClinicalNoteSchema.parse(
    typeof rawInput === 'string' ? { content: rawInput } : rawInput,
  );

  const note = await clinicalRecordService.updateDraftClinicalNote(
    organizationId,
    patientId,
    practitionerId,
    noteId,
    content,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return note;
}

export async function finalizeClinicalNoteAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const { noteId } = finalizeClinicalNoteSchema.parse(
    typeof rawInput === 'string' ? { noteId: rawInput } : rawInput,
  );

  const note = await clinicalRecordService.finalizeClinicalNote(
    organizationId,
    patientId,
    practitionerId,
    noteId,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return note;
}

export async function getEligibleAppointmentsAction(patientId: string) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  return clinicalRecordService.listEligibleAppointmentsForEncounter(
    organizationId,
    patientId,
    practitionerId,
  );
}
