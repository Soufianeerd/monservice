import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { invoiceService } from '@/lib/services/invoice.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any, // Cast pour éviter les erreurs de type strictes
});

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new NextResponse(JSON.stringify({ error: "Stripe non configuré" }), { status: 503 });
  }

  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID manquant' }, { status: 400 });
    }

    const invoice = await invoiceService.getById(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Facture déjà payée' }, { status: 400 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/invoices/${invoice.id}?payment=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/invoices/${invoice.id}?payment=cancel`;

    const { createInvoicePaymentSession } = await import('@/lib/stripe/payment');
    const paymentUrl = await createInvoicePaymentSession(invoice, successUrl, cancelUrl);
    return NextResponse.json({ url: paymentUrl });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la session de paiement' }, { status: 500 });
  }
}
