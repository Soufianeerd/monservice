import 'server-only';
import { getStripe } from './index';
import { Invoice } from '@/lib/data/interfaces/invoice.interface';

export async function createInvoicePaymentSession(
  invoice: Invoice,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Facture ${invoice.number}`,
            description: `Paiement de la facture ${invoice.number}`,
          },
          // Le montant est calculé côté serveur à partir de la facture en base :
          // il n'est jamais transmis par le client.
          unit_amount: Math.round(invoice.totalTTC * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      professionalId: invoice.professionalId || '',
    },
  });

  return session.url!;
}
