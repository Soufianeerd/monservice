import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { userService } from '@/lib/services/user.service';
import { isStripeConfigured } from '@/lib/stripe';
import { createBillingPortalSession } from '@/lib/stripe/billing';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function POST() {
  try {
    const context = await requireProfessional();
    if (!isStripeConfigured()) return NextResponse.json({ error: 'La gestion de l’abonnement est actuellement indisponible.' }, { status: 503 });
    const user = await userService.getUserProfile(context.userId);
    // Aucun customer ID ou retour arbitraire fourni par le navigateur.
    if (!user?.stripeCustomerId) return NextResponse.json({ error: 'Aucun abonnement MonService à gérer pour ce compte.' }, { status: 409 });
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) return NextResponse.json({ error: 'La gestion de l’abonnement est actuellement indisponible.' }, { status: 503 });
    const url = await createBillingPortalSession(user.stripeCustomerId, `${origin}/parametres/facturation`);
    return NextResponse.json({ url });
  } catch (error) {
    return toErrorResponse(error, 'Impossible d’ouvrir la gestion de votre abonnement. Réessayez.');
  }
}
