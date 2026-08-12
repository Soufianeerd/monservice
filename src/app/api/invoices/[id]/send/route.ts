import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '@/lib/services/delivery.service';

import { requireSession } from '@/lib/auth/session';
import { invoiceService } from '@/lib/services/invoice.service';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const ctx = await requireSession();
    
    const invoice = await invoiceService.getById(id);
    if (!invoice || invoice.organizationId !== ctx.organizationId) {
      return NextResponse.json({ error: 'Facture non trouvée ou accès refusé' }, { status: 403 });
    }
    
    const deliveryService = new DeliveryService();
    const result = await deliveryService.sendInvoice(id);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Invoice send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
