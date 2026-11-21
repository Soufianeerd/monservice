import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { buildSalesJournalCsv } from '@/lib/growth/treasury';
import { getSalesJournalRows } from '@/lib/services/treasury.service';
import { toErrorResponse } from '@/lib/utils/api-response';
import { salesJournalRangeSchema } from '@/lib/validation/growth.schemas';

/** Journal des ventes (CSV) d'une période, pour l'expert-comptable. */
export async function GET(req: Request) {
  try {
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    if (ctx.profileType !== 'professional' || !ctx.organizationId) {
      return NextResponse.json({ error: 'Accès réservé aux professionnels' }, { status: 403 });
    }
    const params = new URL(req.url).searchParams;
    const parsed = salesJournalRangeSchema.safeParse({ from: params.get('from'), to: params.get('to') });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Période invalide' }, { status: 400 });
    }
    const rows = await getSalesJournalRows(ctx.organizationId, parsed.data.from, parsed.data.to);
    return new NextResponse(buildSalesJournalCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="journal-ventes_${parsed.data.from}_${parsed.data.to}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Export impossible');
  }
}
