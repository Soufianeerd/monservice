import Stripe from 'stripe';
import { Invoice, Organization } from '@/lib/data/interfaces';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any, // using the one that typically avoids types issues if older version installed
});

export async function createStripePayment(invoice: Invoice, organization: Organization): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: organization.currency?.toLowerCase() || 'eur',
          product_data: {
            name: `Facture ${invoice.number}`,
            description: `Paiement de la facture ${invoice.number}`,
          },
          unit_amount: Math.round(invoice.totalTTC * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoice.id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoice.id}?payment=cancel`,
    metadata: {
      invoiceId: invoice.id,
      organizationId: organization.id,
    },
    customer_email: organization.email,
  });

  return session.url!;
}
