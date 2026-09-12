import {
  CLINICAL_DOCUMENT_CATEGORIES,
  CLINICAL_DOCUMENT_ALLOWED_MIME_TYPES,
  ClinicalDocumentCategory,
  ClinicalDocumentAllowedMimeType,
} from './types';
import { AppError } from '@/lib/errors';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

export function isAllowedMimeType(mimeType: string): mimeType is ClinicalDocumentAllowedMimeType {
  return (CLINICAL_DOCUMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isValidDocumentCategory(category: string): category is ClinicalDocumentCategory {
  return (CLINICAL_DOCUMENT_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Sanitise un nom de fichier pour un stockage sécurisé dans l'arborescence Supabase Storage.
 * Supprime les caractères de contrôle, path traversal (../), accents, et restreint aux caractères sûrs en minuscules.
 */
export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'document.bin';
  }

  // Retirer les composants de chemin (traversal prevention)
  const baseName = trimmed.replace(/^.*[\\/]/, '');

  // Extraire l'extension si présente
  const lastDot = baseName.lastIndexOf('.');
  const namePart = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
  const extPart = lastDot > 0 ? baseName.slice(lastDot).toLowerCase() : '';

  // Normaliser les accents et caractères spéciaux
  const normalized = namePart
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const finalName = normalized || 'document';
  const hasExt = Boolean(extPart && extPart.length > 1);
  const maxNameLen = Math.max(1, 200 - (hasExt ? extPart.length : 4));
  const truncatedName = finalName.slice(0, maxNameLen);

  return hasExt ? `${truncatedName}${extPart}` : `${truncatedName}.bin`;
}

/**
 * Construit le chemin canonique serveur pour un document clinique :
 * organizationId/practitionerId/patientId/documentId/sanitized-file-name
 */
export function buildClinicalDocumentStoragePath(
  organizationId: string,
  practitionerId: string,
  patientId: string,
  documentId: string,
  fileName: string,
): string {
  const safeFileName = sanitizeFileName(fileName);
  return `${organizationId}/${practitionerId}/${patientId}/${documentId}/${safeFileName}`;
}

export function validateDocumentFile(
  mimeType: string,
  sizeBytes: number,
  title: string,
  category: string,
): { title: string; category: ClinicalDocumentCategory; mimeType: ClinicalDocumentAllowedMimeType; sizeBytes: number } {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > 200) {
    throw new AppError('Le titre du document doit contenir entre 1 et 200 caractères', 400, 'INVALID_DOCUMENT_TITLE');
  }

  if (!isValidDocumentCategory(category)) {
    throw new AppError('Catégorie de document invalide', 400, 'INVALID_DOCUMENT_CATEGORY');
  }

  if (!isAllowedMimeType(mimeType)) {
    throw new AppError(
      `Format de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, WEBP.`,
      400,
      'INVALID_MIME_TYPE',
    );
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
    throw new AppError(
      `La taille du fichier (${Math.round(sizeBytes / 1024)} Ko) dépasse la limite autorisée de 10 Mo.`,
      400,
      'DOCUMENT_OVERSIZE',
    );
  }

  return {
    title: trimmedTitle,
    category,
    mimeType,
    sizeBytes,
  };
}
