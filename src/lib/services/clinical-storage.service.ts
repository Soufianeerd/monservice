import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { clinicalDocuments, practicePractitioners, patientProfiles } from '@/lib/db/schema';
import { requireSession, requireProfessional } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { objectStore } from '@/lib/storage/neon-object-store';

export const CLINICAL_DOCUMENTS_BUCKET = 'clinical-documents';
export const SIGNED_URL_TTL_SECONDS = 60;

async function authorizeUploadPath(storagePath: string) {
  const actor = await requireProfessional();
  const [organizationId, practitionerId, patientId, documentId, fileName, ...rest] = storagePath.split('/');
  if (organizationId !== actor.organizationId || !practitionerId || !patientId || !documentId || !fileName || rest.length || storagePath.split('/').some(p => p === '.' || p === '..')) throw new AppError('Chemin interdit', 403);
  const [practitioner] = await db.select({ id: practicePractitioners.id }).from(practicePractitioners).where(and(eq(practicePractitioners.id, practitionerId), eq(practicePractitioners.organizationId, actor.organizationId), eq(practicePractitioners.userId, actor.userId), eq(practicePractitioners.isActive, true)));
  const [patient] = await db.select({ id: patientProfiles.id }).from(patientProfiles).where(and(eq(patientProfiles.id, patientId), eq(patientProfiles.organizationId, actor.organizationId)));
  if (!practitioner || !patient) throw new AppError('Accès clinique refusé', 403);
}

export const clinicalStorageService = {
  async uploadFile(storagePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    await authorizeUploadPath(storagePath);
    await objectStore.put(CLINICAL_DOCUMENTS_BUCKET, storagePath, buffer, mimeType);
  },
  async getSignedDownloadUrl(storagePath: string, expiresIn = SIGNED_URL_TTL_SECONDS): Promise<string> {
    await requireSession();
    // RLS checks the practitioner or active portal grant and patient-visible status.
    const [document] = await db.select({ id: clinicalDocuments.id }).from(clinicalDocuments).where(eq(clinicalDocuments.storagePath, storagePath)).limit(1);
    if (!document) throw new AppError('Document introuvable', 404, 'DOCUMENT_NOT_FOUND');
    return objectStore.presign(CLINICAL_DOCUMENTS_BUCKET, storagePath, expiresIn);
  },
  async removeFileAfterFailedMetadataWrite(storagePath: string): Promise<void> {
    await authorizeUploadPath(storagePath);
    // Compensation is possible only before a metadata record commits.
    const [document] = await db.select({ id: clinicalDocuments.id }).from(clinicalDocuments).where(eq(clinicalDocuments.storagePath, storagePath));
    if (document) throw new AppError('Document conservé', 403);
    await objectStore.removeOrphan(CLINICAL_DOCUMENTS_BUCKET, storagePath);
  },
};
