import {
  FIELD_SERVICE_PROFESSIONS,
  FieldServiceProfessionCode,
  isFieldServiceProfessionCode,
} from '../professions';
import { FAMILY_DEFAULT_TERMINOLOGY } from '../terminology';
import {
  FieldServiceProfessionPack,
  FieldServiceWorkflowProfile,
  FieldServiceCustomerAssetModel,
} from './types';

interface ProfessionPackMeta {
  workflowProfile: FieldServiceWorkflowProfile;
  customerAssetModel: FieldServiceCustomerAssetModel;
  headerTitle?: string;
  quickActionNote?: string;
  defaultVatRate?: number;
}

const PROFESSION_PACK_META: Record<FieldServiceProfessionCode, ProfessionPackMeta> = {
  // Construction Trade (19)
  mason: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Maçonnerie & Gros Œuvre',
    quickActionNote: 'Suivi de chantier et avancement gros œuvre',
    defaultVatRate: 10,
  },
  plumber: {
    workflowProfile: 'project_and_intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Plomberie & Sanitaire',
    quickActionNote: 'Gestion des dépannages et installations sanitaires',
    defaultVatRate: 10,
  },
  electrician: {
    workflowProfile: 'project_and_intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Électricité & Domotique',
    quickActionNote: 'Gestion des mises aux normes et dépannages électriques',
    defaultVatRate: 10,
  },
  heating_technician: {
    workflowProfile: 'project_and_intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Chauffage & Énergie',
    quickActionNote: 'Contrats d’entretien et dépannages chaudières/PAC',
    defaultVatRate: 5.5,
  },
  hvac_technician: {
    workflowProfile: 'project_and_intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Climatisation & Froid',
    quickActionNote: 'Entretien et mise en service de climatiseurs',
    defaultVatRate: 10,
  },
  roofer: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Couverture & Zinguerie',
    quickActionNote: 'Chantiers de réfection toiture et étanchéité',
    defaultVatRate: 10,
  },
  carpenter: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Charpente & Ossature Bois',
    quickActionNote: 'Gestion des chantiers charpente et surélévations',
    defaultVatRate: 10,
  },
  joiner: {
    workflowProfile: 'project',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Menuiserie & Fermetures',
    quickActionNote: 'Pose de menuiseries et fermetures',
    defaultVatRate: 10,
  },
  painter: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Peinture & Décoration',
    quickActionNote: 'Devis revêtements et chantiers de peinture',
    defaultVatRate: 10,
  },
  plasterer: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Plâtrerie & Faux Plafonds',
    quickActionNote: 'Pose de cloisons sèches et doublages',
    defaultVatRate: 10,
  },
  insulation_specialist: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Isolation & Rénovation Énergétique',
    quickActionNote: 'Chantiers ITE/ITI et certificats d’économies d’énergie',
    defaultVatRate: 5.5,
  },
  tiler: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Carrelage & Faïence',
    quickActionNote: 'Chantiers carrelage et revêtements de sol',
    defaultVatRate: 10,
  },
  earthworks_contractor: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Terrassement & VRD',
    quickActionNote: 'Chantiers d’excavation et viabilisation',
    defaultVatRate: 20,
  },
  facade_specialist: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Façade & Ravalement',
    quickActionNote: 'Chantiers de ravalement et isolation thermique extérieure',
    defaultVatRate: 10,
  },
  locksmith: {
    workflowProfile: 'intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Serrurerie & Métallerie',
    quickActionNote: 'Dépannages d’urgence et pose de serrures multipoints',
    defaultVatRate: 10,
  },
  glazier: {
    workflowProfile: 'intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Miroiterie & Vitrerie',
    quickActionNote: 'Remplacement de vitrage et fermetures de sécurité',
    defaultVatRate: 10,
  },
  sanitation_specialist: {
    workflowProfile: 'intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Assainissement & Réseaux',
    quickActionNote: 'Curage, débouchage et mise aux normes assainissement',
    defaultVatRate: 10,
  },
  renovation_contractor: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Entreprise Générale & Rénovation',
    quickActionNote: 'Coordination TCE et chantiers de rénovation complète',
    defaultVatRate: 10,
  },
  pool_specialist: {
    workflowProfile: 'project_and_intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Piscine & Spa',
    quickActionNote: 'Construction de bassins et entretien saisonnier',
    defaultVatRate: 20,
  },

  // Architecture & Engineering (4)
  architect: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Architecture & Conception',
    quickActionNote: 'Projets de conception, permis de construire et suivi MOE',
    defaultVatRate: 20,
  },
  construction_project_manager: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Maîtrise d’Œuvre & Coordination',
    quickActionNote: 'Direction de travaux et ordonnancement de chantiers',
    defaultVatRate: 20,
  },
  engineering_office: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Bureau d’Études Techniques',
    quickActionNote: 'Calculs de structures, diagnostics et notes de calcul',
    defaultVatRate: 20,
  },
  quantity_surveyor: {
    workflowProfile: 'project',
    customerAssetModel: 'property',
    headerTitle: 'Espace Économie de la Construction',
    quickActionNote: 'Chiffrage de projets, DPGF et optimisation des coûts',
    defaultVatRate: 20,
  },

  // Installation & Maintenance (2)
  maintenance_technician: {
    workflowProfile: 'intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Maintenance & Services',
    quickActionNote: 'Interventions de maintenance préventive et curative',
    defaultVatRate: 20,
  },
  technical_installer: {
    workflowProfile: 'intervention',
    customerAssetModel: 'building_equipment',
    headerTitle: 'Espace Installation Technique',
    quickActionNote: 'Pose et raccordement d’équipements spécialisés',
    defaultVatRate: 20,
  },

  // Automotive (3)
  auto_mechanic: {
    workflowProfile: 'work_order',
    customerAssetModel: 'vehicle',
    headerTitle: 'Espace Mécanique Automobile',
    quickActionNote: 'Ordres de réparation, révisions et diagnostic mécanique',
    defaultVatRate: 20,
  },
  auto_body_repairer: {
    workflowProfile: 'work_order',
    customerAssetModel: 'vehicle',
    headerTitle: 'Espace Carrosserie Automobile',
    quickActionNote: 'Dossiers carrosserie, chiffrage et peinture',
    defaultVatRate: 20,
  },
  auto_service_center: {
    workflowProfile: 'work_order',
    customerAssetModel: 'vehicle',
    headerTitle: 'Espace Garage & Centre Automobile',
    quickActionNote: 'Gestion d’atelier mécanique et carrosserie',
    defaultVatRate: 20,
  },

  // Device Repair (4)
  phone_repairer: {
    workflowProfile: 'repair_case',
    customerAssetModel: 'device',
    headerTitle: 'Espace Réparation Téléphonie & Tablettes',
    quickActionNote: 'Dossiers de prise en charge et réparations mobiles',
    defaultVatRate: 20,
  },
  computer_repairer: {
    workflowProfile: 'repair_case',
    customerAssetModel: 'device',
    headerTitle: 'Espace Réparation Informatique',
    quickActionNote: 'Dépannage matériel/logiciel et récupération de données',
    defaultVatRate: 20,
  },
  appliance_repairer: {
    workflowProfile: 'repair_case',
    customerAssetModel: 'device',
    headerTitle: 'Espace Dépannage Électroménager',
    quickActionNote: 'Interventions à domicile et réparations électroménager',
    defaultVatRate: 20,
  },
  electronics_repairer: {
    workflowProfile: 'repair_case',
    customerAssetModel: 'device',
    headerTitle: 'Espace Réparation Électronique',
    quickActionNote: 'Diagnostic composants et réparation de cartes électroniques',
    defaultVatRate: 20,
  },

  // Landscaping (1)
  landscaper: {
    workflowProfile: 'project_and_intervention',
    customerAssetModel: 'property',
    headerTitle: 'Espace Paysage & Espaces Verts',
    quickActionNote: 'Chantiers d’aménagement extérieur et entretien de jardins',
    defaultVatRate: 20,
  },

  // Custom Manufacturing (1)
  custom_manufacturer: {
    workflowProfile: 'project',
    customerAssetModel: 'custom_product',
    headerTitle: 'Espace Atelier & Fabrication Sur-Mesure',
    quickActionNote: 'Commandes atelier et fabrication artisanale',
    defaultVatRate: 20,
  },

  // Artisan Commerce (1)
  artisan_retailer: {
    workflowProfile: 'commerce_order',
    customerAssetModel: 'custom_product',
    headerTitle: 'Espace Commerce Artisanal',
    quickActionNote: 'Vente, commandes et fabrication artisanale',
    defaultVatRate: 20,
  },

  // Technical Services (1)
  technical_service_provider: {
    workflowProfile: 'intervention',
    customerAssetModel: 'none',
    headerTitle: 'Espace Services Techniques',
    quickActionNote: 'Prestations et interventions de terrain',
    defaultVatRate: 20,
  },
};

/**
 * Construit dynamiquement le pack d'une profession à partir des définitions de base.
 */
function buildProfessionPack(code: FieldServiceProfessionCode): FieldServiceProfessionPack {
  const profession = FIELD_SERVICE_PROFESSIONS[code];
  const meta = PROFESSION_PACK_META[code];
  const terminology = FAMILY_DEFAULT_TERMINOLOGY[profession.family];

  return {
    profession: code,
    family: profession.family,
    label: profession.label,
    shortLabel: profession.shortLabel,
    terminology,
    workflowProfile: meta.workflowProfile,
    customerAssetModel: meta.customerAssetModel,
    quotingProfile: {
      defaultVatRate: meta.defaultVatRate ?? 20,
      usesMeasurements: meta.workflowProfile === 'project',
      usesLaborBreakdown: true,
      requiresDeposit: meta.workflowProfile === 'project',
    },
    dashboard: {
      headerTitle: meta.headerTitle,
      quickActionNote: meta.quickActionNote,
    },
  };
}

export const FIELD_SERVICE_PROFESSION_PACKS: Record<FieldServiceProfessionCode, FieldServiceProfessionPack> = (
  Object.keys(FIELD_SERVICE_PROFESSIONS) as FieldServiceProfessionCode[]
).reduce((acc, code) => {
  acc[code] = buildProfessionPack(code);
  return acc;
}, {} as Record<FieldServiceProfessionCode, FieldServiceProfessionPack>);

export function getFieldServiceProfessionPack(code: string | undefined | null): FieldServiceProfessionPack | undefined {
  if (isFieldServiceProfessionCode(code)) {
    return FIELD_SERVICE_PROFESSION_PACKS[code];
  }
  return undefined;
}
