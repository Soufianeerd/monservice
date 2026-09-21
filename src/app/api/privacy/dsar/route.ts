import { NextRequest, NextResponse } from 'next/server';
import { dsarService } from '@/lib/services/dsar.service';
import { requireSession, requireProfessional } from '@/lib/auth/session';
import { RBACService } from '@/lib/services/rbac.service';
import { toErrorResponse } from '@/lib/utils/api-response';
import { z } from 'zod';

const createDsarSchema = z.object({
  type: z.string().min(1, 'Type requis'),
  details: z.string().min(1, 'Détails requis'),
});

const processDsarSchema = z.object({
  requestId: z.string().min(1, 'Identifiant requis'),
  status: z.enum(['COMPLETED', 'REJECTED']),
  response: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.organizationId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createDsarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Champs requis manquants ou invalides' }, { status: 400 });
    }

    const requestObj = await dsarService.createRequest(
      session.userId,
      session.organizationId,
      parsed.data.type,
      parsed.data.details
    );

    return NextResponse.json({ success: true, request: requestObj });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la création de la demande DSAR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireProfessional();
    
    const rbac = new RBACService();
    const canManagePrivacy =
      (await rbac.can(session.userId, session.organizationId, 'privacy:manage')) ||
      (await rbac.can(session.userId, session.organizationId, 'admin'));

    const userRoles = await rbac.getUserRoles(session.userId, session.organizationId);
    if (!canManagePrivacy && !userRoles.includes('admin') && !userRoles.includes('owner')) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 });
    }
    
    const body = await request.json().catch(() => null);
    const parsed = processDsarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Champs requis manquants ou invalides' }, { status: 400 });
    }

    const existing = await dsarService.getById(parsed.data.requestId, session.organizationId);
    if (!existing) {
      return NextResponse.json({ error: 'Demande introuvable ou accès refusé' }, { status: 404 });
    }

    await dsarService.processRequest(
      parsed.data.requestId,
      session.organizationId,
      parsed.data.response || '',
      parsed.data.status,
      session.userId
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors du traitement de la demande DSAR');
  }
}
