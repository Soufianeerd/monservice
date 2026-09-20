import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '@/lib/services/delivery.service';
import { requireProfessional } from '@/lib/auth/session';
import { invoiceService } from '@/lib/services/invoice.service';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const ctx = await requireProfessional();
    
    const invoice = await invoiceService.getById(id);
    if (!invoice || invoice.organizationId !== ctx.organizationId) {
      return NextResponse.json({ error: 'Facture non trouvée ou accès refusé' }, { status: 403 });
    }
    
    const deliveryService = new DeliveryService();
    const result = await deliveryService.sendInvoice(id);
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de l’envoi de la facture');
  }
}
