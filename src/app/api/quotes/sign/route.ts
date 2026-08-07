import { NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { assertFeature, getUserPlan } from '@/lib/billing/quota';
import { toErrorResponse } from '@/lib/utils/api-response';
import { getRequestIp, getUserAgent } from '@/lib/utils/request-info';
import { requireSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    // Identité issue du socle de session (Supabase Auth).
    const ctx = await requireSession();

    const body = await req.json().catch(() => null);
    const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : null;
    const signatureData = typeof body?.signature === 'string' ? body.signature : (typeof body?.signatureData === 'string' ? body.signatureData : null);

    if (!quoteId || !signatureData) {
      return NextResponse.json(
        { error: 'Identifiant du devis et données de signature requis' },
        { status: 400 },
      );
    }

    const quote = await invoiceService.getById(quoteId);
    if (!quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    let profId = quote.professionalId;
    if (!profId) {
      // Fallback si la facture n'a pas enregistré le professionalId à la création
      const { db } = await import('@/lib/db/server');
      const { users } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.organizationId, quote.organizationId)).limit(1);
      if (rows.length > 0) profId = rows[0].id;
    }

    if (!profId) {
      return NextResponse.json({ error: 'Propriétaire du devis introuvable' }, { status: 404 });
    }

    const plan = await getUserPlan(profId);
    if (!plan.features.electronicSignature) {
      return NextResponse.json({ error: 'Signature non autorisée par le plan du professionnel' }, { status: 403 });
    }

    // Le client destinataire ou le professionnel propriétaire peut signer (cas de double signature si implémenté, 
    // ou simplement validation client).
    const isOwner = ctx.organizationId && quote.organizationId === ctx.organizationId;
    const isRecipient = quote.clientId === ctx.userId || quote.recipientUserId === ctx.userId;

    if (!isOwner && !isRecipient) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (quote.type !== 'quote') {
      return NextResponse.json({ error: 'Ce document n’est pas un devis' }, { status: 400 });
    }

    // Invariant métier : une signature ne peut pas être remplacée.
    if (quote.signature) {
      return NextResponse.json({ error: 'Ce devis est déjà signé' }, { status: 409 });
    }

    const updatedQuote = await invoiceService.updateSignature(quoteId, quote.organizationId, {
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
