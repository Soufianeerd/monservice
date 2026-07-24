import { stripe, createStripePayment } from '@/lib/stripe';
import { invoiceRepository } from '@/lib/data/repositories/invoice.repository';
import { organizationRepository } from '@/lib/data/repositories/organization.repository';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { invoiceId, organizationId } = await req.json();

    const invoice = await invoiceRepository.getById(invoiceId);
    const organization = await organizationRepository.getById(organizationId);

    if (!invoice || !organization) {
      return NextResponse.json({ error: 'Facture ou organisation introuvable' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Cette facture est déjà payée' }, { status: 400 });
    }

    const paymentUrl = await createStripePayment(invoice, organization);
    return NextResponse.json({ url: paymentUrl });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 });
  }
}
