import { Invoice } from '../../data/interfaces';
import { PDPResponse } from '../delivery.types';

export class PDPAdapter {
  async send(invoice: Invoice, file: Buffer): Promise<PDPResponse> {
    // In development, simulate sending
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`[PDP] Sending invoice ${invoice.number} to PDP for client ${invoice.clientId}`);
      return {
        success: true,
        platformId: `pdp_${Date.now()}`,
        status: 'accepted',
      };
    }
    
    const pdpUrl = process.env.PDP_API_URL || 'https://chorus-pro.gouv.fr/api/invoice';
    const pdpApiKey = process.env.PDP_API_KEY;
    
    try {
      const response = await fetch(pdpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${pdpApiKey}`,
        },
        body: file as unknown as BodyInit,
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        platformId: data.platformId || `pdp_${Date.now()}`,
        status: response.ok ? 'accepted' : 'rejected',
        errorMessage: data.errorMessage,
      };
    } catch (error) {
      console.error('PDP Adapter Error:', error);
      return {
        success: false,
        status: 'rejected',
        errorMessage: 'NETWORK_ERROR',
      };
    }
  }
}
