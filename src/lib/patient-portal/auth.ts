import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/server';
import { patientPortalAccess } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import type { PatientPortalAccessType } from './types';

export interface PatientPortalUserContext {
  userId: string;
  email: string | null;
  patientId: string;
  organizationId: string;
  accessType: PatientPortalAccessType;
  representativeId: string | null;
  accessiblePatientIds: string[];
}

export async function requirePatientPortalAccess(
  requestedPatientId?: string,
): Promise<PatientPortalUserContext> {
  const session = await requireSession();

  if (session.profileType !== 'client') {
    throw new AppError(
      'Accès réservé aux patients et représentants portail',
      403,
      'PATIENT_PORTAL_CLIENT_REQUIRED',
    );
  }

  const activeAccesses = await db
    .select()
    .from(patientPortalAccess)
    .where(
      and(
        eq(patientPortalAccess.userId, session.userId),
        eq(patientPortalAccess.isActive, true),
      ),
    );

  if (activeAccesses.length === 0) {
    throw new AppError(
      'Aucun accès actif au suivi santé associé à ce compte',
      403,
      'PATIENT_PORTAL_ACCESS_REQUIRED',
    );
  }

  const accessiblePatientIds = activeAccesses.map((a) => a.patientId);

  let targetAccess = activeAccesses[0];

  if (requestedPatientId) {
    const matched = activeAccesses.find((a) => a.patientId === requestedPatientId);
    if (!matched) {
      throw new AppError(
        'Vous n’avez pas accès au dossier de ce patient',
        403,
        'PATIENT_ACCESS_FORBIDDEN',
      );
    }
    targetAccess = matched;
  }

  return {
    userId: session.userId,
    email: session.email,
    patientId: targetAccess.patientId,
    organizationId: targetAccess.organizationId,
    accessType: targetAccess.accessType as PatientPortalAccessType,
    representativeId: targetAccess.representativeId,
    accessiblePatientIds,
  };
}
