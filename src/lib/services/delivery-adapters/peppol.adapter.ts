import { Invoice } from '../../data/interfaces';
import { PeppolResponse } from '../delivery.types';

export class PeppolAdapter {
  async send(invoice: Invoice, file: Buffer): Promise<PeppolResponse> {
    // In development, simulate sending
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`[Peppol] Sending invoice ${invoice.number} for client ${invoice.clientId}`);
      return {
        success: true,
        messageId: `msg_${Date.now()}`,
        status: 'accepted',
      };
    }
    
    try {
      const response = await fetch(process.env.PEPPOL_API_URL || 'https://api.peppol.example/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${process.env.PEPPOL_API_KEY}`,
        },
        body: file as unknown as BodyInit,
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        messageId: data.messageId,
        status: response.ok ? 'accepted' : 'rejected',
        errorCode: data.errorCode,
      };
    } catch (error) {
      console.error('Peppol Adapter Error:', error);
      return {
        success: false,
        status: 'rejected',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}
