import { LegalMentions, QuoteMentions, SiteMentions, TermsMentions, CountryTemplate } from './legal.types';
import frTemplate from '@/lib/data/templates/legal/fr.json';
import deTemplate from '@/lib/data/templates/legal/de.json';
import beTemplate from '@/lib/data/templates/legal/be.json';
import luTemplate from '@/lib/data/templates/legal/lu.json';

const templates: Record<string, CountryTemplate> = {
  FR: frTemplate as CountryTemplate,
  DE: deTemplate as CountryTemplate,
  BE: beTemplate as CountryTemplate,
  LU: luTemplate as CountryTemplate,
};

export class LegalService {
  async getInvoiceMentions(supplierCountry: string, customerCountry: string, language: string = 'fr'): Promise<LegalMentions> {
    const country = supplierCountry?.toUpperCase() || 'FR';
    const customer = customerCountry?.toUpperCase() || 'FR';
    
    // Récupérer les templates pour le pays du fournisseur
    const countryTemplate = templates[country];
    if (!countryTemplate) {
      // Fallback sur la France
      return this.getInvoiceMentions('FR', customerCountry, language);
    }
    
    let legalNotice = countryTemplate.invoice.legalNotice;
    
    // Règle d'autoliquidation intra-UE B2B (simplifiée pour l'exemple)
    if (country !== customer && customer !== 'FR') {
      // Opération intra-UE → autoliquidation
      legalNotice = 'TVA non applicable - autoliquidation par le client';
    }
    
    return {
      paymentTerms: countryTemplate.invoice.paymentTerms,
      latePaymentPenalty: countryTemplate.invoice.latePaymentPenalty,
      indemnity: countryTemplate.invoice.indemnity,
      legalNotice,
    };
  }

  async getQuoteMentions(supplierCountry: string, language: string = 'fr'): Promise<QuoteMentions> {
    const country = supplierCountry?.toUpperCase() || 'FR';
    const countryTemplate = templates[country] || templates['FR'];
    return countryTemplate.quote;
  }

  async getSiteMentions(country: string, language: string = 'fr'): Promise<SiteMentions> {
    const code = country?.toUpperCase() || 'FR';
    const countryTemplate = templates[code] || templates['FR'];
    return countryTemplate.site;
  }

  async getTermsAndConditions(country: string, language: string = 'fr'): Promise<string> {
    const code = country?.toUpperCase() || 'FR';
    const countryTemplate = templates[code] || templates['FR'];
    const terms = countryTemplate.terms;
    
    return `${terms.intro}\n\n${terms.subscription}\n\n${terms.cancellation}\n\n${terms.liability}\n\n${terms.data}`;
  }

  async getPrivacyPolicy(country: string, language: string = 'fr'): Promise<string> {
    const code = country?.toUpperCase() || 'FR';
    const countryTemplate = templates[code] || templates['FR'];
    return countryTemplate.privacy || 'Politique de confidentialité par défaut...';
  }
}

export const legalService = new LegalService();
