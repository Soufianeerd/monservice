import 'server-only';
import { db } from '@/lib/db/server';
import { practicePractitioners, organizations, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { PARAMEDICAL_PROFESSION_CODES } from '@/lib/workspaces/paramedical/professions';
import { requireProfessional } from '@/lib/auth/session';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import type { ParamedicalProfessionCode } from '@/lib/workspaces/paramedical/professions';
import type { ParamedicalProfessionPack } from '@/lib/workspaces/paramedical/profession-packs/types';
import { AppError } from '@/lib/errors';

export interface ClinicalPractitionerContext {
  userId: string;
  organizationId: string;
  practitionerId: string;
  email: string | null;
  profession?: ParamedicalProfessionCode;
  professionPack?: ParamedicalProfessionPack;
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

/**
 * Cabinet tout juste créé, sans aucune fiche praticien : le professionnel qui
 * s'est inscrit est le premier praticien du cabinet. Sa fiche est créée à son
 * premier accès au dossier patient, au lieu de lui opposer un refus. Un cabinet
 * qui a déjà des fiches n'est jamais modifié (secrétariat, associés…).
 */
export async function provisionFirstPractitioner(organizationId: string, userId: string, profession: string | null): Promise<string | null> {
  if (!profession || !(PARAMEDICAL_PROFESSION_CODES as readonly string[]).includes(profession)) return null;
  const [existing] = await db.select({ id: practicePractitioners.id }).from(practicePractitioners)
    .where(eq(practicePractitioners.organizationId, organizationId)).limit(1);
  if (existing) return null;
  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  await db.insert(practicePractitioners).values({
    id: randomUUID(),
    organizationId,
    userId,
    displayName: user?.name?.trim() || user?.email || 'Praticien',
    profession,
    email: user?.email ?? null,
    isActive: true,
  }).onConflictDoNothing();
  return findActiveClinicalPractitioner(organizationId, userId);
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

  const practitionerId = await findActiveClinicalPractitioner(session.organizationId, session.userId)
    ?? await provisionFirstPractitioner(session.organizationId, session.userId, org.profession);
  if (!practitionerId) {
    throw new AppError('Utilisateur non rattaché à un praticien actif dans cette organisation', 403, 'CLINICAL_ACCESS_FORBIDDEN');
  }

  return {
    userId: session.userId,
    organizationId: session.organizationId,
    practitionerId,
    email: session.email,
    profession: workspace.profession,
    professionPack: workspace.professionPack,
  };
}
