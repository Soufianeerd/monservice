import { createInvoicePaymentSession } from '@/lib/stripe/payment';
import { invoiceRepository } from '@/lib/data/repositories/invoice.repository';
import { organizationRepository } from '@/lib/data/repositories/organization.repository';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { invoiceId, organizationId } = await req.json(); // client ID or pro ID depending on the context

    const invoice = await invoiceRepository.getById(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Cette facture est déjà payée' }, { status: 400 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/invoices/${invoice.id}?payment=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/invoices/${invoice.id}?payment=cancel`;

    const paymentUrl = await createInvoicePaymentSession(invoice, successUrl, cancelUrl);
    return NextResponse.json({ url: paymentUrl });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 });
  }
}
