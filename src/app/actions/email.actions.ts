'use server';

import { requireProfessional } from '@/lib/auth/session';
import { assertFeature } from '@/lib/billing/quota';
import { invoiceService } from '@/lib/services/invoice.service';
import { dealService } from '@/lib/services/deal.service';
import { clientService } from '@/lib/services/client.service';
import { organizationService } from '@/lib/services/organization.service';
import { sendEmail } from '@/lib/email';
import { invoiceSentTemplate, quoteSentTemplate } from '@/lib/email/templates';
import { AppError } from '@/lib/errors';

/**
 * Envoi de documents par e-mail.
 *
 * L'envoi doit rester côté serveur : `@/lib/email` est marqué `server-only`
 * (la clé d'API ne doit jamais atteindre le navigateur). L'ancienne page de
 * détail d'un deal important `sendEmail` directement dans un composant
 * client et affichait « (Simulation) » — aucun e-mail n'était envoyé
 * (anomalie MS-015).
 */

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

export async function sendDocumentByEmailAction(
  documentId: string,
): Promise<{ sent: boolean; message: string }> {
  const ctx = await requireProfessional();

  const invoice = await invoiceService.findById(documentId, ctx.organizationId);
  if (!invoice) throw new AppError('Document introuvable', 404, 'NOT_FOUND');

  const [client, organization] = await Promise.all([
    clientService.findById(invoice.clientId, ctx.organizationId),
    organizationService.getById(ctx.organizationId),
  ]);

  const recipient = client?.email;
  if (!recipient) {
    return {
      sent: false,
      message: "Ce client n'a pas d'adresse e-mail renseignée.",
    };
  }

  const isQuote = invoice.type === 'quote';

  const template = isQuote
    ? quoteSentTemplate({
        clientName: client.name,
        organizationName: organization?.name ?? 'Votre prestataire',
        quoteNumber: invoice.number,
        totalTTC: invoice.totalTTC,
        url: appUrl(`/client/quotes/${invoice.id}`),
        message: invoice.message ?? undefined,
      })
    : invoiceSentTemplate({
        clientName: client.name,
        organizationName: organization?.name ?? 'Votre prestataire',
        invoiceNumber: invoice.number,
        totalTTC: invoice.totalTTC,
        dueDate: invoice.dueDate,
        url: appUrl(`/client/invoices/${invoice.id}`),
      });

  const result = await sendEmail({
    to: recipient,
    subject: template.subject,
    html: template.html,
    replyTo: organization?.email ?? undefined,
    tag: isQuote ? 'quote.sent' : 'invoice.sent',
  });

  if (!result.sent) {
    return {
      sent: false,
      message: result.skipped
        ? "L'envoi d'e-mails n'est pas encore configuré sur ce compte."
        : "L'e-mail n'a pas pu être envoyé. Réessayez dans un instant.",
    };
  }

  // Le document passe en « envoyé » uniquement si l'e-mail est réellement parti.
  if (invoice.status === 'draft') {
    await invoiceService.update(
      invoice.id,
      ctx.organizationId,
      { status: 'sent' } as never,
      ctx.userId,
    );
  }

  return { sent: true, message: `Document envoyé à ${recipient}.` };
}

/** Envoi d'un deal (opportunité commerciale) sous forme de devis. */
export async function sendDealByEmailAction(
  dealId: string,
): Promise<{ sent: boolean; message: string }> {
  const ctx = await requireProfessional();
  await assertFeature(ctx, 'messageTemplates');

  const deal = await dealService.findById(dealId, ctx.organizationId);
  if (!deal) throw new AppError('Deal introuvable', 404, 'NOT_FOUND');

  const [client, organization] = await Promise.all([
    clientService.findById(deal.clientId, ctx.organizationId),
    organizationService.getById(ctx.organizationId),
  ]);

  const recipient = client?.email;
  if (!recipient) {
    return { sent: false, message: "Ce client n'a pas d'adresse e-mail renseignée." };
  }

  const template = quoteSentTemplate({
    clientName: client.name,
    organizationName: organization?.name ?? 'Votre prestataire',
    quoteNumber: deal.name,
    totalTTC: deal.value,
    url: appUrl(`/deals/${deal.id}`),
    message: deal.description ?? undefined,
  });

  const result = await sendEmail({
    to: recipient,
    subject: template.subject,
    html: template.html,
    replyTo: organization?.email ?? undefined,
    tag: 'deal.sent',
  });

  return result.sent
    ? { sent: true, message: `Devis envoyé à ${recipient}.` }
    : {
        sent: false,
        message: result.skipped
          ? "L'envoi d'e-mails n'est pas encore configuré sur ce compte."
          : "L'e-mail n'a pas pu être envoyé.",
      };
}
