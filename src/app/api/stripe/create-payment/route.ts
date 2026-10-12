import { NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';
import { requireBillingReadAuthority } from '@/lib/billing/authorization';

/**
 * Ancien accès de paiement : les honoraires sont réglés au professionnel.
 * Les contrôles de lecture restent actifs ; aucune session Stripe n’est créée.
 *
 * L'ancienne version acceptait n'importe quel `invoiceId` sans
 * authentification : elle permettait d'énumérer les factures et d'en lire les
 * montants (IDOR). Le client Stripe était par ailleurs instancié au niveau du
 * module, ce qui faisait échouer le build (MS-010).
 */
export async function POST(req: Request) {
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

    if (invoice.type === 'quote') {
      return NextResponse.json(
        { error: 'Un devis ne peut pas être payé directement. Une facture d’acompte ou de solde doit être émise.' },
        { status: 400 },
      );
    }

    await requireBillingReadAuthority(invoice, ctx.userId);

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Facture déjà payée' }, { status: 409 });
    }

    const payableAmount = typeof invoice.amountDue === 'number' && invoice.amountDue > 0
      ? invoice.amountDue
      : invoice.totalTTC;

    if (payableAmount <= 0) {
      return NextResponse.json({ error: 'Aucun montant restant dû sur cette facture' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Le règlement de cette facture se fait directement auprès du professionnel.' },
      { status: 410 },
    );
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors de la création de la session de paiement');
  }
}
