'use server';

import { recordAudit } from '@/lib/audit/record';
import { requireProfessional } from '@/lib/auth/session';
import { assertFeature } from '@/lib/billing/quota';
import { invoiceService } from '@/lib/services/invoice.service';
import { dealService } from '@/lib/services/deal.service';
import { clientService } from '@/lib/services/client.service';
import { organizationService } from '@/lib/services/organization.service';
import { sendEmail } from '@/lib/email';
import { invoiceSentTemplate, quoteSentTemplate } from '@/lib/email/templates';
import { AppError } from '@/lib/errors';
import { quoteService } from '@/lib/services/quote.service';
import { renderBillingDocumentPdf, billingDocumentFilename } from '@/lib/pdf/billing-document.server';
import { issuerBankLine } from '@/lib/legal/issuer';

/**
 * Envoi de documents par e-mail.
 *
 * L'envoi doit rester côté serveur : `@/lib/email` est marqué `server-only`
 * (la clé d'API ne doit jamais atteindre le navigateur). L'ancienne page de
 * détail d'un deal important `sendEmail` directement dans un composant
 * client et affichait « (Simulation) » — aucun e-mail n'était envoyé
 * (anomalie MS-015).
 */


export async function sendDocumentByEmailAction(
  documentId: string,
): Promise<{ sent: boolean; message: string }> {
  const ctx = await requireProfessional();

  let document = await invoiceService.findById(documentId, ctx.organizationId);
  if (!document) throw new AppError('Document introuvable', 404, 'NOT_FOUND');

  const [client, organization] = await Promise.all([
    clientService.findById(document.clientId, ctx.organizationId),
    organizationService.getById(ctx.organizationId),
  ]);
  if (!organization) throw new AppError('Organisation introuvable', 404, 'NOT_FOUND');

  const recipient = client?.email;
  if (!client || !recipient) {
    return { sent: false, message: "Ce client n'a pas d'adresse e-mail renseignée." };
  }
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, message: "L'envoi d'e-mails n'est pas encore configuré sur MonService." };
  }

  const isQuote = document.type === 'quote';

  // Une facture brouillon est d'abord émise : le PDF joint porte son numéro
  // définitif. Un devis brouillon passe « envoyé » après l'envoi réussi.
  if (!isQuote && document.status === 'draft') {
    document = await invoiceService.update(document.id, ctx.organizationId, { status: 'sent' }, ctx.userId);
  }

  const pdf = await renderBillingDocumentPdf(document, organization, client);
  const template = isQuote
    ? quoteSentTemplate({
        clientName: client.name,
        organizationName: organization.name,
        quoteNumber: document.number,
        totalTTC: document.totalTTC,
        message: document.message ?? undefined,
      })
    : invoiceSentTemplate({
        clientName: client.name,
        organizationName: organization.name,
        invoiceNumber: document.number,
        totalTTC: document.totalTTC,
        dueDate: document.dueDate,
        paymentDetails: issuerBankLine(organization),
      });

  const result = await sendEmail({
    to: recipient,
    subject: template.subject,
    html: template.html,
    replyTo: organization.email ?? undefined,
    tag: isQuote ? 'quote.sent' : 'invoice.sent',
    onBehalfOf: organization.name,
    attachments: [{ filename: billingDocumentFilename(document), content: pdf.toString('base64'), contentType: 'application/pdf' }],
  });

  if (!result.sent) {
    return { sent: false, message: "L'e-mail n'a pas pu être envoyé. Réessayez dans un instant." };
  }

  if (isQuote && document.status === 'draft') {
    await quoteService.sendQuote(document.id, ctx.organizationId, ctx.userId);
  }

  await recordAudit({ userId: ctx.userId, organizationId: ctx.organizationId, action: 'document.emailed', entityType: isQuote ? 'quote' : 'invoice', entityId: documentId });
  return { sent: true, message: `${isQuote ? 'Devis' : 'Facture'} envoyé${isQuote ? '' : 'e'} à ${recipient}, avec le PDF en pièce jointe.` };
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
