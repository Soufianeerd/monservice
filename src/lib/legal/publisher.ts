import 'server-only';

/**
 * Identité de l'éditeur de MonService (mentions légales, LCEN art. 6).
 *
 * Elle vient de la configuration, jamais d'un modèle : l'ancienne version
 * affichait une société fictive (« MonService SAS, RCS Paris 123 456 789 »)
 * sur le site et en pied de chaque e-mail. Tant qu'une information n'est pas
 * renseignée, la page le dit au lieu d'inventer.
 */
export type Publisher = {
  name: string | null;
  legalForm: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  siret: string | null;
  vatId: string | null;
  vatExempt: boolean;
  director: string | null;
};

function read(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getPublisher(): Publisher {
  return {
    name: read('PUBLISHER_NAME'),
    legalForm: read('PUBLISHER_LEGAL_FORM'),
    address: read('PUBLISHER_ADDRESS'),
    email: read('PUBLISHER_EMAIL'),
    phone: read('PUBLISHER_PHONE'),
    siret: read('PUBLISHER_SIRET'),
    vatId: read('PUBLISHER_VAT_ID'),
    vatExempt: process.env.PUBLISHER_VAT_EXEMPT === 'true',
    director: read('PUBLISHER_DIRECTOR'),
  };
}

export function isPublisherComplete(publisher: Publisher = getPublisher()): boolean {
  return Boolean(publisher.name && publisher.address && publisher.email && publisher.siret && publisher.director);
}

/** Hébergeur du site (LCEN) : Netlify sert l'application. */
export const SITE_HOST = {
  name: 'Netlify, Inc.',
  // Adresse publiée dans le contrat Netlify (Enterprise Master Subscription Agreement).
  address: '101 2nd Street, Suite 575, San Francisco, CA 94105, États-Unis',
} as const;
