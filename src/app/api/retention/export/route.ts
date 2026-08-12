import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!session.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const buffer = await retentionService.exportArchive(
      session.organizationId,
      new Date(startDate),
      new Date(endDate)
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="archive-${startDate}-to-${endDate}.zip"`,
      },
    });
  } catch (error) {
    console.error('Retention export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
