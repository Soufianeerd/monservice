import { NextResponse } from 'next/server';

/**
 * @deprecated Session 18 Architecture:
 * Deal = opportunité commerciale CRM.
 * Invoice[type='quote'] = seul devis commercial légal canonique.
 * Utilisez l'API /api/quotes/sign ou la Server Action acceptQuoteAction.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Cette route est dépréciée. Un Deal est une opportunité commerciale et non un devis. Utilisez la signature de devis canonique (/api/quotes/sign).',
      code: 'DEAL_SIGN_DEPRECATED',
    },
    { status: 410 }
  );
}
