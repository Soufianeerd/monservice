import { Resend } from 'resend';
import { Invoice } from '../../data/interfaces';
import { EmailResponse } from '../delivery.types';
import { clientService } from '../client.service';

import { readFileSync } from 'fs';
import path from 'path';
import { formatCurrency } from '../../utils/locale';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export class EmailAdapter {
  async send(invoice: Invoice, file: Buffer): Promise<EmailResponse> {
    try {
      const fileName = `invoice_${invoice.number}.xml`;
      const base64File = file.toString('base64');
      
      const client = await clientService.findById(invoice.clientId, invoice.organizationId);
      const recipientEmail = client?.email || 'client@example.com';
      const language = 'fr'; // TODO: fetch from client preferences

      // In development, simulate sending
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.log(`[Email] Simulating email to ${recipientEmail} with attachment ${fileName}`);
        return {
          success: true,
          messageId: `email_${Date.now()}`,
          status: 'sent',
        };
      }
      
      const templatePath = path.join(process.cwd(), `public/locales/${language}/email.json`);
      const template = JSON.parse(readFileSync(templatePath, 'utf-8'));

      const subject = template.invoice_subject.replace('{{number}}', invoice.number);
      const body = template.invoice_body
        .replace('{{number}}', invoice.number)
        .replace('{{total}}', formatCurrency(invoice.totalTTC || 0, 'EUR', language));

      const result = await resend.emails.send({
        from: 'MonService <factures@monservice.com>',
        to: recipientEmail,
        subject,
        html: body,
        attachments: [
          {
            filename: fileName,
            content: base64File,
            contentType: 'application/xml',
          },
        ],
      });
      
      if (result.error) {
         console.error('Email Adapter Resend Error:', result.error);
         return {
            success: false,
            status: 'rejected',
            errorCode: 'EMAIL_ERROR',
         };
      }

      return {
        success: true,
        messageId: result.data?.id,
        status: 'sent',
      };
    } catch (error) {
      console.error('Email Adapter Error:', error);
      return {
        success: false,
        status: 'rejected',
        errorCode: 'EMAIL_ERROR',
      };
    }
  }
}
