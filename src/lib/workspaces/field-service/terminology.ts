import { FieldServiceBusinessFamilyCode } from './families';

export interface FieldServiceTerminology {
  customerSingular: string;
  customerPlural: string;
  serviceSingular: string;
  servicePlural: string;
  workSingular: string;
  workPlural: string;
  quoteLabel?: string;
  invoiceLabel?: string;
}

export const DEFAULT_FIELD_SERVICE_TERMINOLOGY: FieldServiceTerminology = {
  customerSingular: 'Client',
  customerPlural: 'Clients',
  serviceSingular: 'Prestation',
  servicePlural: 'Prestations',
  workSingular: 'Intervention',
  workPlural: 'Interventions',
  quoteLabel: 'Devis',
  invoiceLabel: 'Facture',
};

export const FAMILY_DEFAULT_TERMINOLOGY: Record<FieldServiceBusinessFamilyCode, FieldServiceTerminology> = {
  construction_trade: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Ouvrage',
    servicePlural: 'Ouvrages',
    workSingular: 'Chantier',
    workPlural: 'Chantiers',
    quoteLabel: 'Devis travaux',
    invoiceLabel: 'Facture travaux',
  },
  architecture_engineering: {
    customerSingular: 'Maître d’ouvrage',
    customerPlural: 'Maîtres d’ouvrage',
    serviceSingular: 'Mission',
    servicePlural: 'Missions',
    workSingular: 'Projet',
    workPlural: 'Projets',
    quoteLabel: 'Proposition d’honoraires',
    invoiceLabel: 'Note d’honoraires',
  },
  installation_maintenance: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Intervention',
    servicePlural: 'Interventions',
    workSingular: 'Intervention',
    workPlural: 'Interventions',
    quoteLabel: 'Devis intervention',
    invoiceLabel: 'Facture',
  },
  automotive: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Forfait entretien',
    servicePlural: 'Forfaits entretien',
    workSingular: 'Ordre de réparation',
    workPlural: 'Ordres de réparation',
    quoteLabel: 'Devis réparation',
    invoiceLabel: 'Facture garage',
  },
  device_repair: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Forfait réparation',
    servicePlural: 'Forfaits réparation',
    workSingular: 'Dossier réparation',
    workPlural: 'Dossiers réparation',
    quoteLabel: 'Devis réparation',
    invoiceLabel: 'Facture',
  },
  landscaping_outdoor: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Prestation',
    servicePlural: 'Prestations',
    workSingular: 'Chantier paysager',
    workPlural: 'Chantiers paysagers',
    quoteLabel: 'Devis aménagement',
    invoiceLabel: 'Facture',
  },
  custom_manufacturing: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Création',
    servicePlural: 'Créations',
    workSingular: 'Commande atelier',
    workPlural: 'Commandes atelier',
    quoteLabel: 'Devis sur-mesure',
    invoiceLabel: 'Facture',
  },
  artisan_commerce: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Article / Prestation',
    servicePlural: 'Articles / Prestations',
    workSingular: 'Commande',
    workPlural: 'Commandes',
    quoteLabel: 'Devis / Commande',
    invoiceLabel: 'Ticket / Facture',
  },
  technical_services: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    serviceSingular: 'Prestation technique',
    servicePlural: 'Prestations techniques',
    workSingular: 'Intervention',
    workPlural: 'Interventions',
    quoteLabel: 'Devis',
    invoiceLabel: 'Facture',
  },
};
