import { NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';

/**
 * Route interne de simulation de webhook Stripe de paiement.
 * STRICTEMENT INTERDITE EN PRODUCTION.
 * Utilisée exclusivement pour les tests d'intégration et E2E en environnement de test/développement.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint interdit en production' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { invoiceId, amountPaidCents } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 });
    }

    const paymentIntentId = `pi_test_simulated_${Date.now()}`;
    const invoice = await invoiceService.markAsPaidFromStripeWebhook(
      invoiceId,
      paymentIntentId,
      amountPaidCents
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentIntentId: invoice.paymentIntentId,
      amountDue: invoice.amountDue,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne de simulation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
