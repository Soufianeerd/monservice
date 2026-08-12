export interface DeliveryResult {
  invoiceId: string;
  channel: 'peppol' | 'pdp' | 'email' | 'api';
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'rejected';
  response?: any;
  error?: string;
  trackingId?: string;
  sentAt: Date;
}

export interface PeppolResponse {
  success: boolean;
  messageId?: string;
  status: 'accepted' | 'rejected';
  errorCode?: string;
}

export interface PDPResponse {
  success: boolean;
  platformId?: string;
  status: 'accepted' | 'rejected' | 'pending';
  errorMessage?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'rejected';
  errorCode?: string;
}
