import 'server-only';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { AppError } from '@/lib/errors';

export const CLINICAL_DOCUMENTS_BUCKET = 'clinical-documents';
export const SIGNED_URL_TTL_SECONDS = 60;

function getPrivilegedStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    return createSupabaseAdminClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return null;
}

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

  /**
   * Opération interne de compensation serveur : supprime un fichier téléversé si l'insertion des métadonnées DB échoue.
   * Ne doit JAMAIS être exposée directement aux utilisateurs comme fonctionnalité de suppression.
   */
  async removeFileAfterFailedMetadataWrite(storagePath: string): Promise<void> {
    const privilegedClient = getPrivilegedStorageClient();
    const storageClient = privilegedClient ? privilegedClient.storage : (await createClient()).storage;

    const { error } = await storageClient
      .from(CLINICAL_DOCUMENTS_BUCKET)
      .remove([storagePath]);

    if (error) {
      throw new AppError(
        `Échec du nettoyage du fichier orphelin : ${error.message}`,
        500,
        'STORAGE_CLEANUP_FAILED',
      );
    }
  },
};
