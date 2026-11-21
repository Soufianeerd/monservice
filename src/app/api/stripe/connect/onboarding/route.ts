import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

/** Stripe appartient à MonService pour les abonnements SaaS uniquement. */
export async function POST() {
  try {
    await requireProfessional();
    return NextResponse.json({ error: 'Aucun compte Stripe professionnel n’est nécessaire pour utiliser MonService.' }, { status: 410 });
  } catch (error) {
    return toErrorResponse(error, 'Accès non autorisé.');
  }
}
