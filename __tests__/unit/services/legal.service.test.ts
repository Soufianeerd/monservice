import { describe, it, expect } from 'vitest';
import { legalService } from '@/lib/services/legal.service';

describe('LegalService', () => {
  describe('getInvoiceMentions', () => {
    it('should return French mentions for FR supplier and FR customer', async () => {
      const mentions = await legalService.getInvoiceMentions('FR', 'FR');
      expect(mentions.legalNotice).toBe('TVA selon les règles en vigueur');
      expect(mentions.paymentTerms).toContain('30 jours');
    });

    it('should trigger reverse charge for FR supplier and BE customer (Intra-EU B2B)', async () => {
      const mentions = await legalService.getInvoiceMentions('FR', 'BE');
      expect(mentions.legalNotice).toBe('TVA non applicable - autoliquidation par le client');
    });

    it('should fallback to France if supplier country is unknown', async () => {
      const mentions = await legalService.getInvoiceMentions('XX', 'FR');
      expect(mentions.legalNotice).toBe('TVA selon les règles en vigueur');
    });
  });

  describe('getTermsAndConditions', () => {
    it('should return French CGV for FR', async () => {
      const cgv = await legalService.getTermsAndConditions('FR');
      expect(cgv).toContain('France');
    });

    it('should return German CGV for DE', async () => {
      const cgv = await legalService.getTermsAndConditions('DE');
      expect(cgv).toContain('Deutschland');
    });
  });

  describe('getSiteMentions', () => {
    it('should return publisher details', async () => {
      const site = await legalService.getSiteMentions('FR');
      expect(site.publisher).toBe('MonService SAS');
      expect(site.hosting).toBe('Netlify, Inc.');
    });
  });
});
