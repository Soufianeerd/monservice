import { NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { isStripeConfigured } from '@/lib/stripe';
import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';
import { AppError } from '@/lib/errors';

/**
 * Crée une session de paiement Stripe pour une facture.
 *
 * L'ancienne version acceptait n'importe quel `invoiceId` sans
 * authentification : elle permettait d'énumérer les factures et d'en lire les
 * montants (IDOR). Le client Stripe était par ailleurs instancié au niveau du
 * module, ce qui faisait échouer le build (MS-010).
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  try {
    const ctx = await requireSession();

    const body = await req.json().catch(() => null);
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : null;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Identifiant de facture manquant' }, { status: 400 });
    }

    const invoice = await invoiceService.getById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Seuls le professionnel émetteur de l'organisation ou le client destinataire
    // (recipientUserId) peuvent déclencher un paiement pour cette facture.
    const isIssuer =
      ctx.profileType === 'professional' &&
      Boolean(ctx.organizationId) &&
      invoice.organizationId === ctx.organizationId;
    const isRecipient =
      ctx.profileType === 'client' &&
      invoice.recipientUserId === ctx.userId;

    if (!isIssuer && !isRecipient) {
      throw new AppError('Accès refusé à cette facture', 403, 'FORBIDDEN');
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Facture déjà payée' }, { status: 409 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { createInvoicePaymentSession } = await import('@/lib/stripe/payment');
    const paymentUrl = await createInvoicePaymentSession(
      invoice,
      `${baseUrl}/client/invoices/${invoice.id}?payment=success`,
      `${baseUrl}/client/invoices/${invoice.id}?payment=cancel`,
    );

    return NextResponse.json({ url: paymentUrl });
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors de la création de la session de paiement');
  }
}
