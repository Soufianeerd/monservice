import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { AppError } from '@/lib/errors';

export const CLINICAL_DOCUMENTS_BUCKET = 'clinical-documents';
export const SIGNED_URL_TTL_SECONDS = 60;

export const clinicalStorageService = {
  /**
   * Téléverse un fichier de document clinique dans le bucket privé Supabase Storage.
   */
  async uploadFile(storagePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.storage
      .from(CLINICAL_DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new AppError(
        `Échec du téléversement du document : ${error.message}`,
        500,
        'STORAGE_UPLOAD_FAILED',
      );
    }
  },

  /**
   * Génère une URL signée de courte durée (60 secondes) pour le téléchargement sécurisé.
   */
  async getSignedDownloadUrl(storagePath: string, expiresIn = SIGNED_URL_TTL_SECONDS): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(CLINICAL_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new AppError(
        `Impossible de générer le lien de téléchargement sécurisé : ${error?.message || 'Lien introuvable'}`,
        500,
        'STORAGE_DOWNLOAD_URL_FAILED',
      );
    }

    return data.signedUrl;
  },
};
