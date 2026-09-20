import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';
import { RBACService } from '@/lib/services/rbac.service';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function GET() {
  try {
    const session = await requireProfessional();

    const rbac = new RBACService();
    await rbac.require(session.userId, session.organizationId, 'audit:view');

    const audit = new AuditService();
    const logs = await audit.getLogs(session.organizationId);

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la récupération des journaux d’audit');
  }
}
