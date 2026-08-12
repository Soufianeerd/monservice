import 'server-only';

/**
 * Envoi d'e-mails — implémentation réelle (Resend).
 *
 * L'ancienne version était une simulation : un `console.log`, un
 * `setTimeout(1000)`, et `return true` systématique. Aucun e-mail n'a jamais
 * été envoyé depuis l'application — ni facture, ni relance, ni notification
 * (anomalie MS-015). Le code appelant croyait pourtant à un succès.
 *
 * Comportement en l'absence de `RESEND_API_KEY` : les e-mails sont journalisés
 * et **explicitement signalés comme NON envoyés**. Le mode dégradé doit être
 * visible, pas silencieux — c'est précisément ce qui manquait.
 */

export type EmailAttachment = {
  filename: string;
  /** Contenu encodé en base64. */
  content: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Étiquette de traçabilité (`invoice.sent`, `quote.reminder`…). */
  tag?: string;
};

export type SendEmailResult = {
  sent: boolean;
  id?: string;
  error?: string;
  /** `true` lorsque l'e-mail n'a pas été envoyé faute de configuration. */
  skipped?: boolean;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getFromAddress(): string {
  // Doit correspondre à un domaine vérifié chez Resend (SPF + DKIM),
  // sinon les messages partiront en spam ou seront rejetés.
  return process.env.EMAIL_FROM || 'MonService <onboarding@resend.dev>';
}

/** Repli texte brut : améliore la délivrabilité et l'accessibilité. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

import { legalService } from '@/lib/services/legal.service';

export async function sendEmail(input: SendEmailInput & { country?: string; locale?: string }): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  if (!apiKey) {
    // Mode dégradé explicite : jamais de faux succès silencieux.
    console.warn('[email] NON ENVOYÉ — RESEND_API_KEY absente', {
      to: recipients,
      subject: input.subject,
      tag: input.tag,
    });
    return { sent: false, skipped: true, error: 'RESEND_API_KEY non configurée' };
  }

  try {
    // Add legal footers
    const mentions = await legalService.getSiteMentions(input.country || 'FR', input.locale || 'fr');
    const legalFooterHtml = `
      <hr style="margin-top: 40px; border: 1px solid #eee;" />
      <p style="font-size: 10px; color: #6b7280; text-align: center;">
        Cet email est envoyé par <strong>${mentions.publisher}</strong><br/>
        ${mentions.publisherAddress}<br/>
        Immatriculation : ${mentions.registrationNumber} - TVA : ${mentions.vatId}
      </p>
    `;
    const legalFooterText = `\n\n---\nCet email est envoyé par ${mentions.publisher}\n${mentions.publisherAddress}\nImmatriculation : ${mentions.registrationNumber} - TVA : ${mentions.vatId}`;

    const finalHtml = input.html + legalFooterHtml;
    const finalText = (input.text ?? htmlToText(input.html)) + legalFooterText;

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: recipients,
        subject: input.subject,
        html: finalHtml,
        text: finalText,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
        ...(input.tag ? { tags: [{ name: 'category', value: input.tag }] } : {}),
      }),
      // Sans délai maximal, un fournisseur lent bloquerait la requête utilisateur.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[email] échec envoi', {
        status: response.status,
        detail: detail.slice(0, 500),
        to: recipients,
        tag: input.tag,
      });
      return { sent: false, error: `Erreur ${response.status}` };
    }

    const data = (await response.json()) as { id?: string };

    console.info('[audit] email.sent', {
      id: data.id,
      to: recipients,
      tag: input.tag,
      at: new Date().toISOString(),
    });

    return { sent: true, id: data.id };
  } catch (error) {
    // Un échec d'envoi ne doit jamais faire échouer l'action métier :
    // la facture est créée même si l'e-mail ne part pas.
    console.error("[email] exception à l'envoi", { error, to: recipients, tag: input.tag });
    return { sent: false, error: "Échec de l'envoi" };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
