import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '@/lib/services/delivery.service';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Add authorization checks
    
    const deliveryService = new DeliveryService();
    const result = await deliveryService.sendInvoice(id);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Invoice send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
