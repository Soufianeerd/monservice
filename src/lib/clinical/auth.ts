import 'server-only';
import { db } from '@/lib/db/server';
import { practicePractitioners, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireProfessional } from '@/lib/auth/session';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { AppError } from '@/lib/errors';

export interface ClinicalPractitionerContext {
  userId: string;
  organizationId: string;
  practitionerId: string;
  email: string | null;
}

export async function findActiveClinicalPractitioner(
  organizationId: string,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: practicePractitioners.id })
    .from(practicePractitioners)
    .where(
      and(
        eq(practicePractitioners.organizationId, organizationId),
        eq(practicePractitioners.userId, userId),
        eq(practicePractitioners.isActive, true),
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

export async function requireClinicalPractitionerContext(): Promise<ClinicalPractitionerContext> {
  const session = await requireProfessional();
  if (!session.organizationId) {
    throw new AppError('Aucune organisation associée', 403, 'CLINICAL_ACCESS_FORBIDDEN');
  }

  const [org] = await db
    .select({
      id: organizations.id,
      sector: organizations.sector,
      profession: organizations.profession,
      country: organizations.country,
    })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  if (!org) {
    throw new AppError('Organisation introuvable', 403, 'CLINICAL_ACCESS_FORBIDDEN');
  }

  const workspace = resolveWorkspace({
    sector: org.sector,
    profession: org.profession,
    country: org.country,
  });

  if (
    workspace.type !== 'paramedical' ||
    !workspace.capabilities.includes('clinicalRecords') ||
    !workspace.capabilities.includes('careEpisodes')
  ) {
    throw new AppError('Espace de travail non autorisé pour le dossier clinique', 403, 'CLINICAL_ACCESS_FORBIDDEN');
  }

  const practitionerId = await findActiveClinicalPractitioner(session.organizationId, session.userId);
  if (!practitionerId) {
    throw new AppError('Utilisateur non rattaché à un praticien actif dans cette organisation', 403, 'CLINICAL_ACCESS_FORBIDDEN');
  }

  return {
    userId: session.userId,
    organizationId: session.organizationId,
    practitionerId,
    email: session.email,
  };
}
