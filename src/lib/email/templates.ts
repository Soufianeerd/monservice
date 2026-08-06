import 'server-only';

/**
 * Gabarits d'e-mails transactionnels.
 *
 * Contraintes volontaires :
 *  - HTML en tableaux et styles en ligne : c'est ce que comprennent Outlook et
 *    les clients de messagerie, pas le CSS moderne ;
 *  - aucune image distante bloquante ;
 *  - un seul appel à l'action, clairement identifiable ;
 *  - aucune donnée sensible dans le corps du message (un e-mail transite et se
 *    stocke en clair).
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('fr-FR').format(d);
}

function layout(options: { title: string; body: string; ctaLabel?: string; ctaUrl?: string }) {
  const cta =
    options.ctaLabel && options.ctaUrl
      ? `<tr><td style="padding:24px 0;">
           <a href="${options.ctaUrl}"
              style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;
                     border-radius:6px;display:inline-block;font-weight:600;font-size:15px;">
             ${escapeHtml(options.ctaLabel)}
           </a>
         </td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
        <tr><td style="font-size:20px;font-weight:700;color:#111827;padding-bottom:16px;">
          ${escapeHtml(options.title)}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#374151;">
          ${options.body}
        </td></tr>
        ${cta}
        <tr><td style="padding-top:24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
          Envoyé par MonService.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function quoteSentTemplate(params: {
  clientName: string;
  organizationName: string;
  quoteNumber: string;
  totalTTC: number;
  url: string;
  message?: string;
}) {
  return {
    subject: `Devis ${params.quoteNumber} de ${params.organizationName}`,
    html: layout({
      title: `Votre devis ${escapeHtml(params.quoteNumber)}`,
      body: `
        <p>Bonjour ${escapeHtml(params.clientName)},</p>
        <p><strong>${escapeHtml(params.organizationName)}</strong> vous a adressé un devis
           d'un montant de <strong>${formatAmount(params.totalTTC)} TTC</strong>.</p>
        ${params.message ? `<p style="background:#f9fafb;padding:12px;border-radius:6px;">${escapeHtml(params.message)}</p>` : ''}
      `,
      ctaLabel: 'Consulter le devis',
      ctaUrl: params.url,
    }),
  };
}

export function invoiceSentTemplate(params: {
  clientName: string;
  organizationName: string;
  invoiceNumber: string;
  totalTTC: number;
  dueDate?: string | null;
  url: string;
}) {
  return {
    subject: `Facture ${params.invoiceNumber} de ${params.organizationName}`,
    html: layout({
      title: `Votre facture ${escapeHtml(params.invoiceNumber)}`,
      body: `
        <p>Bonjour ${escapeHtml(params.clientName)},</p>
        <p>Veuillez trouver votre facture d'un montant de
           <strong>${formatAmount(params.totalTTC)} TTC</strong>.</p>
        ${params.dueDate ? `<p>Échéance de paiement : <strong>${formatDate(params.dueDate)}</strong>.</p>` : ''}
      `,
      ctaLabel: 'Consulter et régler la facture',
      ctaUrl: params.url,
    }),
  };
}

export function invoiceReminderTemplate(params: {
  clientName: string;
  organizationName: string;
  invoiceNumber: string;
  totalTTC: number;
  dueDate: string;
  daysOverdue: number;
  url: string;
}) {
  // Ton mesuré : une relance automatique trop sèche abîme la relation
  // commerciale de l'utilisateur avec son propre client.
  const tone =
    params.daysOverdue <= 0
      ? `arrive à échéance le <strong>${formatDate(params.dueDate)}</strong>`
      : `est échue depuis <strong>${params.daysOverdue} jour${params.daysOverdue > 1 ? 's' : ''}</strong>`;

  return {
    subject: `Rappel — facture ${params.invoiceNumber}`,
    html: layout({
      title: `Rappel de règlement`,
      body: `
        <p>Bonjour ${escapeHtml(params.clientName)},</p>
        <p>Sauf erreur de notre part, la facture <strong>${escapeHtml(params.invoiceNumber)}</strong>
           d'un montant de <strong>${formatAmount(params.totalTTC)} TTC</strong> ${tone}.</p>
        <p>Si le règlement a déjà été effectué, merci de ne pas tenir compte de ce message.</p>
      `,
      ctaLabel: 'Consulter la facture',
      ctaUrl: params.url,
    }),
  };
}

export function dataExportTemplate(params: { name: string; url: string }) {
  return {
    subject: 'Export de vos données personnelles',
    html: layout({
      title: 'Vos données sont prêtes',
      body: `
        <p>Bonjour ${escapeHtml(params.name)},</p>
        <p>L'export de vos données personnelles, demandé au titre du RGPD, est disponible.</p>
        <p>Ce lien expire dans 24 heures.</p>
      `,
      ctaLabel: 'Télécharger mes données',
      ctaUrl: params.url,
    }),
  };
}

export function accountDeletionTemplate(params: { name: string; deletionDate: string }) {
  return {
    subject: 'Confirmation de suppression de votre compte',
    html: layout({
      title: 'Votre compte a été supprimé',
      body: `
        <p>Bonjour ${escapeHtml(params.name)},</p>
        <p>Votre compte MonService a été supprimé le ${formatDate(params.deletionDate)}.</p>
        <p>Vos données personnelles ont été effacées ou anonymisées. Les documents
           comptables (factures) sont conservés de façon anonymisée pendant 10 ans,
           conformément aux obligations légales de conservation.</p>
      `,
    }),
  };
}
