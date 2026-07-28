import { invoiceRepository } from '@/lib/data/repositories/invoice.repository';
import { requestRepository } from '@/lib/data/repositories/request.repository';
import { NextResponse } from 'next/server';
// import { notificationService } from '@/lib/services/notification.service'; // We will create this or use a simple console.log for now

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quoteId, signature } = body;
    
    // In a real app, you would get the IP address from req headers
    const signatureIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const quote = await invoiceRepository.getById(quoteId);

    if (!quote || quote.type !== 'quote') {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    if (quote.status === 'paid' || quote.signature) {
      return NextResponse.json({ error: 'Ce devis est déjà signé' }, { status: 400 });
    }

    const updatedQuote = await invoiceRepository.updateSignature(quoteId, {
      signature,
      signatureIp
    });

    if (quote.requestId) {
      await requestRepository.update(quote.requestId, { status: 'in_progress' });
    }

    // TODO: Send notification to the professional
    console.log(`[NOTIFICATION] Le devis ${quote.number} a été signé par le client.`);

    return NextResponse.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Erreur lors de la signature:', error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde de la signature' }, { status: 500 });
  }
}
