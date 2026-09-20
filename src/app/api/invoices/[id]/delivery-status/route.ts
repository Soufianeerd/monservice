import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const ctx = await requireSession();
    
    const invoice = await invoiceService.getById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    const isIssuer =
      ctx.profileType === 'professional' &&
      Boolean(ctx.organizationId) &&
      invoice.organizationId === ctx.organizationId;
    const isRecipient =
      ctx.profileType === 'client' &&
      invoice.recipientUserId === ctx.userId;

    if (!isIssuer && !isRecipient) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    
    if (isRecipient) {
      return NextResponse.json({
        invoiceId: invoice.id,
        deliveryStatus: invoice.deliveryStatus || 'pending',
        deliverySentAt: invoice.deliverySentAt,
      });
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      deliveryStatus: invoice.deliveryStatus || 'pending',
      deliveryChannel: invoice.deliveryChannel,
      deliveryTrackingId: invoice.deliveryTrackingId,
      deliveryAttempts: invoice.deliveryAttempts || 0,
      deliverySentAt: invoice.deliverySentAt,
      deliveryLastAttemptAt: invoice.deliveryLastAttemptAt,
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la récupération du statut de livraison');
  }
}
