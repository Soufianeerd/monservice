/**
 * Sous-traitants ultérieurs réellement utilisés par MonService (RGPD art. 28).
 * Toute modification de cette liste doit être annoncée aux clients avant
 * l'entrée en service du nouveau sous-traitant (voir le contrat de sous-traitance).
 */
export interface Subprocessor {
  name: string;
  service: string;
  data: string;
  location: string;
  safeguard: string;
}

export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Neon (Databricks, Inc.)',
    service: 'Base de données, authentification, stockage des documents',
    data: 'Toutes les données du compte et de l’activité',
    location: 'Union européenne (Francfort, Allemagne)',
    safeguard: 'Données stockées dans l’UE ; contrat de sous-traitance du fournisseur',
  },
  {
    name: 'Netlify, Inc.',
    service: 'Hébergement et exécution de l’application',
    data: 'Données traitées lors de chaque requête (non stockées durablement)',
    location: 'États-Unis',
    safeguard: 'EU-US Data Privacy Framework et clauses contractuelles types',
  },
  {
    name: 'Resend, Inc.',
    service: 'Envoi des e-mails (codes de connexion, devis, factures, rappels)',
    data: 'Adresse e-mail du destinataire, contenu et pièces jointes du message',
    location: 'États-Unis / Union européenne',
    safeguard: 'Clauses contractuelles types',
  },
];
