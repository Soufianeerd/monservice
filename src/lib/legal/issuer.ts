import type { Organization } from '@/lib/data/interfaces';

/**
 * Mentions de l'émetteur sur un devis ou une facture (code de commerce
 * L. 441-9, CGI 242 nonies A) : forme juridique, SIRET, TVA ou franchise,
 * coordonnées bancaires. Rien n'est inventé : une information absente n'est
 * simplement pas imprimée.
 */
export const VAT_EXEMPT_NOTICE = 'TVA non applicable, article 293 B du CGI';

function formatSiret(siret: string): string {
  return siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4');
}

export function issuerPostalLine(org: Pick<Organization, 'postalCode' | 'zipCode' | 'city'>): string {
  return [org.postalCode || org.zipCode, org.city].filter(Boolean).join(' ');
}

export function issuerLegalLines(org: Pick<Organization, 'legalForm' | 'siret' | 'vatNumber' | 'vatExempt'>): string[] {
  const lines: string[] = [];
  const identity = [org.legalForm, org.siret ? `SIRET ${formatSiret(org.siret)}` : null].filter(Boolean).join(' — ');
  if (identity) lines.push(identity);
  if (org.vatNumber) lines.push(`N° TVA intracommunautaire : ${org.vatNumber}`);
  else if (org.vatExempt) lines.push(VAT_EXEMPT_NOTICE);
  return lines;
}

export function issuerBankLine(org: Pick<Organization, 'iban' | 'bic' | 'bankDetails'>): string | null {
  if (org.iban) {
    const iban = org.iban.replace(/(.{4})/g, '$1 ').trim();
    return `Règlement par virement — IBAN ${iban}${org.bic ? ` — BIC ${org.bic}` : ''}`;
  }
  return org.bankDetails?.trim() ? org.bankDetails.trim() : null;
}

/** Ligne de pied : nom, identité légale et numéro du document. */
export function issuerFooterLine(org: Pick<Organization, 'name' | 'legalForm' | 'siret' | 'vatNumber' | 'vatExempt'>, documentLabel: string): string {
  return [org.name, ...issuerLegalLines(org), documentLabel].filter(Boolean).join(' — ');
}
