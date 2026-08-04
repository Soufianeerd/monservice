import { dealService } from '@/lib/services/deal.service';
import { userService } from '@/lib/services/user.service';
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Obtenir l'utilisateur depuis la DB pour avoir son organizationId
    const dbUser = await userService.getUserProfile(user.id);
    if (!dbUser?.organizationId) {
       return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 403 });
    }

    const { dealId, signatureData } = await req.json();

    if (!dealId || !signatureData) {
      return NextResponse.json({ error: 'Deal ID et données de signature requis' }, { status: 400 });
    }

    const deal = await dealService.findById(dealId, dbUser.organizationId);
    
    if (!deal) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    if (deal.signature) {
      return NextResponse.json({ error: 'Ce devis est déjà signé' }, { status: 400 });
    }

    const updatedDeal = await dealService.update(dealId, dbUser.organizationId, { 
      signature: signatureData, 
      signedAt: new Date().toISOString() 
    }, dbUser.id);

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la signature:', error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
  }
}
