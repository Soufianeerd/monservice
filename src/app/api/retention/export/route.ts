import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';
import { toErrorResponse } from '@/lib/utils/api-response';

function sanitizeDateString(dateStr: string): string {
  return dateStr.replace(/[^0-9\-T:]/g, '_');
}

export async function POST(req: Request) {
  try {
    const session = await requireProfessional();

    const body = await req.json().catch(() => null);
    const { startDate, endDate } = body || {};

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 400 });
    }

    const buffer = await retentionService.exportArchive(
      session.organizationId,
      start,
      end
    );

    const safeStart = sanitizeDateString(String(startDate));
    const safeEnd = sanitizeDateString(String(endDate));

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="archive-${safeStart}-to-${safeEnd}.zip"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de l’export de l’archive');
  }
}
