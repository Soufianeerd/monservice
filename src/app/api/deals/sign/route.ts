import { dealRepository } from '@/lib/data/repositories/deal.repository';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { dealId, signatureData } = await req.json();

    if (!dealId || !signatureData) {
      return NextResponse.json({ error: 'Deal ID et données de signature requis' }, { status: 400 });
    }

    const deal = await dealRepository.getById(dealId);
    
    if (!deal) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    if (deal.signature) {
      return NextResponse.json({ error: 'Ce devis est déjà signé' }, { status: 400 });
    }

    const updatedDeal = await dealRepository.updateSignature(dealId, signatureData);

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la signature:', error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
  }
}
