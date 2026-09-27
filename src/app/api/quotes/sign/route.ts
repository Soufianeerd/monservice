import { NextResponse } from 'next/server';
import { quoteService } from '@/lib/services/quote.service';
import { toErrorResponse } from '@/lib/utils/api-response';
import { getRequestIp, getUserAgent } from '@/lib/utils/request-info';
import { requireSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();

    const body = await req.json().catch(() => null);
    const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : null;
    const signatureData = typeof body?.signature === 'string'
      ? body.signature
      : (typeof body?.signatureData === 'string' ? body.signatureData : null);

    if (!quoteId || !signatureData) {
      return NextResponse.json(
        { error: 'Identifiant du devis et données de signature requis' },
        { status: 400 },
      );
    }

    const acceptedQuote = await quoteService.acceptQuote(
      quoteId,
      signatureData,
      ctx.userId,
      getRequestIp(req),
      getUserAgent(req)
    );

    return NextResponse.json({ success: true, quote: acceptedQuote });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la sauvegarde de la signature');
  }
}
