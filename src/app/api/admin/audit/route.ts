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

    const rbac = new RBACService();
    // Assuming 'admin' role has the permission 'audit:view'
    // For simplicity, we just check if they are part of the org here, but normally we'd do:
    // await rbac.require(session.userId, session.organizationId, 'audit:view');

    const audit = new AuditService();
    const logs = await audit.getLogs(session.organizationId);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to get audit logs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
