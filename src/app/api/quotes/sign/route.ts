import { NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { quoteId, signatureData } = await req.json();

    if (!quoteId || !signatureData) {
      return NextResponse.json({ error: 'Devis ID et données de signature requis' }, { status: 400 });
    }

    const quote = await invoiceService.getById(quoteId);
    
    if (!quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    if (quote.signature) {
      return NextResponse.json({ error: 'Ce devis est déjà signé' }, { status: 400 });
    }

    const updatedQuote = await invoiceService.updateSignature(quoteId, signatureData);

    return NextResponse.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Erreur lors de la signature:', error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde de la signature' }, { status: 500 });
  }
}
