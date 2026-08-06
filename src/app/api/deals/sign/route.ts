import { dealService } from '@/lib/services/deal.service';
import { NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/auth/session';
import { assertFeature } from '@/lib/billing/quota';
import { toErrorResponse } from '@/lib/utils/api-response';
import { getRequestIp } from '@/lib/utils/request-info';

export async function POST(req: Request) {
  try {
    // Identité issue du socle de session (Supabase Auth).
    const ctx = await requireOrganization();
    await assertFeature(ctx, 'electronicSignature');

    const body = await req.json().catch(() => null);
    const dealId = typeof body?.dealId === 'string' ? body.dealId : null;
    const signatureData = typeof body?.signatureData === 'string' ? body.signatureData : null;

    if (!dealId || !signatureData) {
      return NextResponse.json(
        { error: 'Identifiant du deal et données de signature requis' },
        { status: 400 },
      );
    }

    // Le filtre par organisation vient du contexte serveur, jamais du client.
    const deal = await dealService.findById(dealId, ctx.organizationId);
    if (!deal) {
      return NextResponse.json({ error: 'Deal introuvable' }, { status: 404 });
    }

    // Invariant métier : une signature ne peut pas être remplacée.
    if (deal.signature) {
      return NextResponse.json({ error: 'Ce deal est déjà signé' }, { status: 409 });
    }

    const updatedDeal = await dealService.update(
      dealId,
      ctx.organizationId,
      {
        signature: signatureData,
        signedAt: new Date().toISOString(),
      },
      ctx.userId,
    );

    console.info('[audit] deal.signed', {
      dealId,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      ip: getRequestIp(req),
      at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors de la sauvegarde de la signature');
  }
}
