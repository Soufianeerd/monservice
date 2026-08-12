import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Add authorization checks
    
    const invoice = await invoiceService.getById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
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
