import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';
import { RBACService } from '@/lib/services/rbac.service';

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';

    const audit = new AuditService();
    const exportData = await audit.exportLogs(session.organizationId, format);

    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="audit-logs.${format}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export audit logs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
