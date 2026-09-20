import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';
import { RBACService } from '@/lib/services/rbac.service';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function GET(req: Request) {
  try {
    const session = await requireProfessional();

    const rbac = new RBACService();
    await rbac.require(session.userId, session.organizationId, 'audit:view');

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';

    const audit = new AuditService();
    const exportData = await audit.exportLogs(session.organizationId, format);

    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="audit-logs.${format}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de l’export des journaux d’audit');
  }
}
