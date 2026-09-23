import 'server-only';
import { db } from '@/lib/db/server';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireProfessional } from '@/lib/auth/session';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import type { FieldServiceProfessionCode } from './professions';
import type { FieldServiceProfessionPack } from './profession-packs/types';
import type { FieldServiceBusinessFamilyCode } from './families';
import { AppError } from '@/lib/errors';

export interface FieldServiceContext {
  userId: string;
  organizationId: string;
  email: string | null;
  sector: string;
  profession?: FieldServiceProfessionCode;
  professionPack?: FieldServiceProfessionPack;
  businessFamily?: FieldServiceBusinessFamilyCode;
}

export async function requireFieldServiceContext(): Promise<FieldServiceContext> {
  const session = await requireProfessional();
  if (!session.organizationId) {
    throw new AppError('Aucune organisation associée', 403, 'FIELD_SERVICE_ACCESS_FORBIDDEN');
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
    throw new AppError('Organisation introuvable', 403, 'FIELD_SERVICE_ACCESS_FORBIDDEN');
  }

  const workspace = resolveWorkspace({
    sector: org.sector,
    profession: org.profession,
    country: org.country,
  });

  if (workspace.type !== 'field_service') {
    throw new AppError('Espace de travail non autorisé pour les opérations Field Service', 403, 'FIELD_SERVICE_ACCESS_FORBIDDEN');
  }

  return {
    userId: session.userId,
    organizationId: session.organizationId,
    email: session.email,
    sector: org.sector || 'field_services',
    profession: workspace.profession,
    professionPack: workspace.professionPack,
    businessFamily: workspace.businessFamily,
  };
}
