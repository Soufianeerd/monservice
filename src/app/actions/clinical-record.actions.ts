'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { AppError, isAppError } from '@/lib/errors';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { clinicalStorageService } from '@/lib/services/clinical-storage.service';
import { buildClinicalDocumentStoragePath } from '@/lib/clinical/documents';
import type { ClinicalDocumentDTO } from '@/lib/clinical/types';
import {
  createCareEpisodeSchema,
  createClinicalEncounterSchema,
  createClinicalNoteSchema,
  updateDraftClinicalNoteSchema,
  closeCareEpisodeSchema,
  finalizeClinicalNoteSchema,
  uploadClinicalDocumentMetadataSchema,
  archiveClinicalDocumentSchema,
  getClinicalDocumentDownloadUrlSchema,
  createClinicalFormTemplateSchema,
  updateClinicalFormTemplateSchema,
  createClinicalFormResponseSchema,
  updateDraftClinicalFormResponseSchema,
  finalizeClinicalFormResponseSchema,
  createClinicalMeasurementSchema,
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

// ==========================================
// SESSION 12 : DOCUMENTS ACTIONS
// ==========================================

export async function uploadClinicalDocumentAction(patientId: string, formData: FormData) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();

  const file = formData.get('file');
  if (!file || typeof file === 'string' || !(file instanceof Blob)) {
    throw new AppError('Fichier manquant ou invalide', 400, 'FILE_REQUIRED');
  }

  const titleRaw = formData.get('title');
  const categoryRaw = formData.get('category');
  const careEpisodeIdRaw = formData.get('careEpisodeId');
  const encounterIdRaw = formData.get('encounterId');

  const title = typeof titleRaw === 'string' ? titleRaw : (file instanceof File ? file.name : 'Document');
  const category = typeof categoryRaw === 'string' ? categoryRaw : '';
  const careEpisodeId = typeof careEpisodeIdRaw === 'string' && careEpisodeIdRaw.trim().length > 0 ? careEpisodeIdRaw.trim() : null;
  const encounterId = typeof encounterIdRaw === 'string' && encounterIdRaw.trim().length > 0 ? encounterIdRaw.trim() : null;
  const fileName = file instanceof File ? file.name : 'document.bin';

  const validatedMeta = uploadClinicalDocumentMetadataSchema.parse({
    title,
    category,
    careEpisodeId,
    encounterId,
    fileName,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  const documentId = randomUUID();
  const storagePath = buildClinicalDocumentStoragePath(
    organizationId,
    practitionerId,
    patientId,
    documentId,
    validatedMeta.fileName,
  );

  // 1. Déposer dans le stockage sécurisé
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await clinicalStorageService.uploadFile(storagePath, buffer, validatedMeta.mimeType);

  // 2. Enregistrer les métadonnées DB avec compensation / rollback
  let document: ClinicalDocumentDTO;
  try {
    document = await clinicalRecordService.createClinicalDocumentMetadata(
      organizationId,
      patientId,
      practitionerId,
      {
        id: documentId,
        careEpisodeId: validatedMeta.careEpisodeId,
        encounterId: validatedMeta.encounterId,
        title: validatedMeta.title,
        category: validatedMeta.category,
        fileName: validatedMeta.fileName,
        mimeType: validatedMeta.mimeType,
        sizeBytes: validatedMeta.sizeBytes,
        storagePath,
      },
    );
  } catch (dbError) {
    try {
      await clinicalStorageService.removeFileAfterFailedMetadataWrite(storagePath);
    } catch (cleanupError) {
      const cleanupErrorCode = isAppError(cleanupError)
        ? cleanupError.code || 'STORAGE_CLEANUP_FAILED'
        : 'STORAGE_CLEANUP_FAILED';

      console.error('[ClinicalStorageRollbackError] Orphan cleanup failed', {
        code: cleanupErrorCode,
      });

      throw new AppError(
        'Échec de l\'enregistrement des métadonnées et échec de la compensation du stockage',
        500,
        'STORAGE_ROLLBACK_FAILED',
      );
    }
    throw dbError;
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return document;
}

export async function archiveClinicalDocumentAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const { documentId } = archiveClinicalDocumentSchema.parse(
    typeof rawInput === 'string' ? { documentId: rawInput } : rawInput,
  );

  const document = await clinicalRecordService.archiveClinicalDocument(
    organizationId,
    patientId,
    practitionerId,
    documentId,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return document;
}

export async function getClinicalDocumentDownloadUrlAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const { documentId } = getClinicalDocumentDownloadUrlSchema.parse(
    typeof rawInput === 'string' ? { documentId: rawInput } : rawInput,
  );

  const document = await clinicalRecordService.getClinicalDocument(
    organizationId,
    patientId,
    practitionerId,
    documentId,
  );

  if (!document) {
    throw new AppError('Document introuvable', 404, 'DOCUMENT_NOT_FOUND');
  }

  const downloadUrl = await clinicalStorageService.getSignedDownloadUrl(document.storagePath, 60);

  return { downloadUrl };
}

// ==========================================
// SESSION 12 : FORM TEMPLATES ACTIONS
// ==========================================

export async function createClinicalFormTemplateAction(rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = createClinicalFormTemplateSchema.parse(rawInput);

  const template = await clinicalRecordService.createFormTemplate(
    organizationId,
    practitionerId,
    input,
  );

  return template;
}

export async function updateClinicalFormTemplateAction(templateId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = updateClinicalFormTemplateSchema.parse(
    typeof rawInput === 'object' && rawInput !== null ? { ...rawInput, templateId } : { templateId },
  );

  const template = await clinicalRecordService.updateFormTemplate(
    organizationId,
    practitionerId,
    templateId,
    input,
  );

  return template;
}

export async function listClinicalFormTemplatesAction(activeOnly = false) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  return clinicalRecordService.listFormTemplates(organizationId, practitionerId, activeOnly);
}

// ==========================================
// SESSION 12 : FORM RESPONSES ACTIONS
// ==========================================

export async function createClinicalFormResponseAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = createClinicalFormResponseSchema.parse(rawInput);

  const response = await clinicalRecordService.createFormResponse(
    organizationId,
    patientId,
    practitionerId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return response;
}

export async function updateDraftClinicalFormResponseAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = updateDraftClinicalFormResponseSchema.parse(rawInput);

  const response = await clinicalRecordService.updateDraftFormResponse(
    organizationId,
    patientId,
    practitionerId,
    input.responseId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return response;
}

export async function finalizeClinicalFormResponseAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = finalizeClinicalFormResponseSchema.parse(
    typeof rawInput === 'string' ? { responseId: rawInput } : rawInput,
  );

  const response = await clinicalRecordService.finalizeFormResponse(
    organizationId,
    patientId,
    practitionerId,
    input.responseId,
    input.answersJson,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return response;
}

// ==========================================
// SESSION 12 : MEASUREMENTS ACTIONS
// ==========================================

export async function createClinicalMeasurementAction(patientId: string, rawInput: unknown) {
  const { organizationId, practitionerId } = await requireClinicalPractitionerContext();
  const input = createClinicalMeasurementSchema.parse(rawInput);

  const measurement = await clinicalRecordService.createMeasurement(
    organizationId,
    patientId,
    practitionerId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/clinique`);
  return measurement;
}
