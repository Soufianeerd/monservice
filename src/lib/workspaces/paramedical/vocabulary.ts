/**
 * Vocabulaire des écrans santé et bien-être.
 *
 * Les écrans ont été écrits pour les professions de santé (« patient »,
 * « cabinet », « soins »). Un coach, un nutritionniste ou un praticien en
 * massage bien-être parle de « client », d'« activité » et de « prestations » :
 * ce module adapte un texte au vocabulaire du métier, d'après la terminologie
 * de son pack (customerSingular).
 */
export type CareVocabulary = 'patient' | 'client';

const CLIENT_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bjournée au cabinet\b/g, 'journée'],
  [/\bActions du cabinet\b/g, 'Actions'],
  [/\bvotre cabinet\b/g, 'votre activité'],
  [/\bVotre cabinet\b/g, 'Votre activité'],
  [/\bdu cabinet\b/g, 'de l’activité'],
  [/\bDu cabinet\b/g, 'De l’activité'],
  [/\bau cabinet\b/g, 'à votre activité'],
  [/\ble cabinet\b/g, 'l’activité'],
  [/\bLe cabinet\b/g, 'L’activité'],
  [/\bun cabinet\b/g, 'un local'],
  [/\bfacture de soins\b/g, 'facture'],
  [/\bDossier clinique\b/g, 'Suivi des séances'],
  [/ & Notes d'Honoraires\b/g, ''],
  [/ ou son représentant légal/g, ''],
  [/\bfactures de soins\b/g, 'factures'],
  [/\bPortail Santé Patient\b/g, 'Portail client'],
  [/\bpatientes\b/g, 'clientes'],
  [/\bpatiente\b/g, 'cliente'],
  [/\bpatients\b/g, 'clients'],
  [/\bpatient\b/g, 'client'],
  [/\bPatients\b/g, 'Clients'],
  [/\bPatient\b/g, 'Client'],
];

export function vocabularyFromCustomerTerm(customerSingular: string | null | undefined): CareVocabulary {
  return customerSingular?.trim().toLowerCase() === 'client' ? 'client' : 'patient';
}

export function adaptCareText(text: string, vocabulary: CareVocabulary): string {
  if (vocabulary === 'patient' || !text) return text;
  return CLIENT_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

/**
 * Adapte en profondeur un objet de textes (aides, parcours guidés). Seules les
 * phrases sont touchées : les identifiants et sélecteurs (sans espace, ou avec
 * « [ » / « =" ») restent intacts.
 */
export function adaptCareTexts<T>(value: T, vocabulary: CareVocabulary): T {
  if (vocabulary === 'patient') return value;
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') {
      return item.includes(' ') && !item.includes('[') && !item.includes('="') ? adaptCareText(item, vocabulary) : item;
    }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object' && Object.getPrototypeOf(item) === Object.prototype) {
      return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry)]));
    }
    return item;
  };
  return visit(value) as T;
}
