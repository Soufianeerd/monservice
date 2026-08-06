'use client';

import toast from 'react-hot-toast';
import { AppError } from '@/lib/errors';

// Réexport pour compatibilité avec les imports existants.
// Les nouveaux fichiers serveur doivent importer depuis '@/lib/errors'.
export { AppError } from '@/lib/errors';

export function handleError(error: unknown, fallbackMessage?: string) {
  if (error instanceof AppError) {
    toast.error(error.message);
    console.error(`[${error.code || 'ERROR'}] ${error.message}`);
  } else if (error instanceof Error) {
    toast.error(fallbackMessage || error.message);
    console.error(error);
  } else {
    toast.error(fallbackMessage || 'Une erreur est survenue');
    console.error(error);
  }
}
