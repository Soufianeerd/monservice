import { describe, expect, it } from 'vitest';
import { issuerBankLine, issuerFooterLine, issuerLegalLines, issuerPostalLine, VAT_EXEMPT_NOTICE } from '@/lib/legal/issuer';

describe('Mentions de l’émetteur sur les devis et factures', () => {
  it('imprime forme juridique, SIRET et franchise de TVA', () => {
    expect(issuerLegalLines({ legalForm: 'Entrepreneur individuel (micro-entreprise)', siret: '12345678900012', vatNumber: null, vatExempt: true }))
      .toEqual(['Entrepreneur individuel (micro-entreprise) — SIRET 123 456 789 00012', VAT_EXEMPT_NOTICE]);
  });

  it('préfère le numéro de TVA à la mention de franchise', () => {
    expect(issuerLegalLines({ legalForm: 'SAS', siret: null, vatNumber: 'FR12345678901', vatExempt: true }))
      .toEqual(['SAS', 'N° TVA intracommunautaire : FR12345678901']);
  });

  it('n’invente jamais « N/A »', () => {
    expect(issuerLegalLines({ legalForm: null, siret: null, vatNumber: null, vatExempt: false })).toEqual([]);
    expect(issuerFooterLine({ name: 'Plomberie Martin', legalForm: null, siret: null, vatNumber: null, vatExempt: false }, 'Facture N° F-1')).toBe('Plomberie Martin — Facture N° F-1');
  });

  it('lit le code postal enregistré (postalCode) et formate l’IBAN', () => {
    expect(issuerPostalLine({ postalCode: '57000', city: 'Metz' })).toBe('57000 Metz');
    expect(issuerBankLine({ iban: 'FR7630006000011234567890189', bic: 'AGRIFRPP', bankDetails: undefined }))
      .toBe('Règlement par virement — IBAN FR76 3000 6000 0112 3456 7890 189 — BIC AGRIFRPP');
  });
});
