import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';

import { requireSession } from '@/lib/auth/session';

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

    const isIssuer = ctx.organizationId && invoice.organizationId === ctx.organizationId;
    const isRecipient = invoice.clientId === ctx.userId || invoice.professionalId === ctx.userId;
    if (!isIssuer && !isRecipient) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    
    return NextResponse.json({
      invoiceId: invoice.id,
      deliveryStatus: invoice.deliveryStatus || 'pending',
      deliveryChannel: invoice.deliveryChannel,
      deliveryTrackingId: invoice.deliveryTrackingId,
      deliveryAttempts: invoice.deliveryAttempts || 0,
      deliverySentAt: invoice.deliverySentAt,
      deliveryLastAttemptAt: invoice.deliveryLastAttemptAt,
      // optionally parse response if safe to expose
    });
  } catch (error: any) {
    console.error('Delivery status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
