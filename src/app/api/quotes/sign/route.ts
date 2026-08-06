import { NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { requireOrganization } from '@/lib/auth/session';
import { assertFeature } from '@/lib/billing/quota';
import { toErrorResponse } from '@/lib/utils/api-response';
import { getRequestIp, getUserAgent } from '@/lib/utils/request-info';

export async function POST(req: Request) {
  try {
    // Identité issue du socle de session (Supabase Auth).
    const ctx = await requireOrganization();
    await assertFeature(ctx, 'electronicSignature');

    const body = await req.json().catch(() => null);
    const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : null;
    const signatureData = typeof body?.signatureData === 'string' ? body.signatureData : null;

    if (!quoteId || !signatureData) {
      return NextResponse.json(
        { error: 'Identifiant du devis et données de signature requis' },
        { status: 400 },
      );
    }

    // L'ancienne version utilisait `getById(quoteId)` sans filtre d'organisation :
    // n'importe quel utilisateur pouvait signer le devis d'un autre locataire.
    const quote = await invoiceService.findById(quoteId, ctx.organizationId);
    if (!quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    if (quote.type !== 'quote') {
      return NextResponse.json({ error: 'Ce document n’est pas un devis' }, { status: 400 });
    }

    // Invariant métier : une signature ne peut pas être remplacée.
    if (quote.signature) {
      return NextResponse.json({ error: 'Ce devis est déjà signé' }, { status: 409 });
    }

    const updatedQuote = await invoiceService.updateSignature(quoteId, ctx.organizationId, {
      signature: signatureData,
      signatureIp: getRequestIp(req),
      signedByUserId: ctx.userId,
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({ success: true, quote: updatedQuote });
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors de la sauvegarde de la signature');
  }
}
