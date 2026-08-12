export interface LegalMentions {
  invoiceNumber?: string;
  date?: string;
  supplier?: {
    name: string;
    address: string;
    vatId: string;
    legalForm: string;
    registrationNumber: string;
  };
  customer?: {
    name: string;
    address: string;
    vatId?: string;
  };
  paymentTerms: string;
  latePaymentPenalty: string;
  indemnity: string;
  legalNotice: string;
}

export interface QuoteMentions {
  validity: string;
  acceptance: string;
}

export interface SiteMentions {
  publisher: string;
  publisherAddress: string;
  publisherEmail: string;
  publisherPhone: string;
  registrationNumber: string;
  vatId: string;
  hosting: string;
  hostingAddress: string;
}

export interface TermsMentions {
  intro: string;
  subscription: string;
  cancellation: string;
  liability: string;
  data: string;
}

export interface CountryTemplate {
  invoice: LegalMentions;
  quote: QuoteMentions;
  site: SiteMentions;
  terms: TermsMentions;
  privacy: string;
}
