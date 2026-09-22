import { FieldServiceBusinessFamilyCode } from './families';

export const FIELD_SERVICE_PROFESSION_CODES = [
  // Construction Trade (19)
  'mason',
  'plumber',
  'electrician',
  'heating_technician',
  'hvac_technician',
  'roofer',
  'carpenter',
  'joiner',
  'painter',
  'plasterer',
  'insulation_specialist',
  'tiler',
  'earthworks_contractor',
  'facade_specialist',
  'locksmith',
  'glazier',
  'sanitation_specialist',
  'renovation_contractor',
  'pool_specialist',

  // Architecture & Engineering (4)
  'architect',
  'construction_project_manager',
  'engineering_office',
  'quantity_surveyor',

  // Installation & Maintenance (2)
  'maintenance_technician',
  'technical_installer',

  // Automotive (3)
  'auto_mechanic',
  'auto_body_repairer',
  'auto_service_center',

  // Device Repair (4)
  'phone_repairer',
  'computer_repairer',
  'appliance_repairer',
  'electronics_repairer',

  // Landscaping (1)
  'landscaper',

  // Custom Manufacturing (1)
  'custom_manufacturer',

  // Artisan Commerce (1)
  'artisan_retailer',

  // Technical Services (1)
  'technical_service_provider',
] as const;

export type FieldServiceProfessionCode = typeof FIELD_SERVICE_PROFESSION_CODES[number];

export interface FieldServiceProfession {
  code: FieldServiceProfessionCode;
  family: FieldServiceBusinessFamilyCode;
  label: string;
  shortLabel?: string;
  description: string;
}

export const FIELD_SERVICE_PROFESSIONS: Record<FieldServiceProfessionCode, FieldServiceProfession> = {
  // --- Construction Trade ---
  mason: {
    code: 'mason',
    family: 'construction_trade',
    label: 'Maçon',
    description: 'Gros œuvre, maçonnerie générale, fondations et élévation de murs.',
  },
  plumber: {
    code: 'plumber',
    family: 'construction_trade',
    label: 'Plombier',
    description: 'Installation sanitaire, tuyauterie, raccordements et dépannage.',
  },
  electrician: {
    code: 'electrician',
    family: 'construction_trade',
    label: 'Électricien',
    description: 'Installations électriques, mise aux normes, tableaux et câblage.',
  },
  heating_technician: {
    code: 'heating_technician',
    family: 'construction_trade',
    label: 'Chauffagiste',
    description: 'Installation, maintenance et dépannage de chaudières et pompes à chaleur.',
  },
  hvac_technician: {
    code: 'hvac_technician',
    family: 'construction_trade',
    label: 'Frigoriste / Climatisation',
    shortLabel: 'Climatisation / HVAC',
    description: 'Systèmes de climatisation, ventilation mécanique et froid commercial.',
  },
  roofer: {
    code: 'roofer',
    family: 'construction_trade',
    label: 'Couvreur / Zingueur',
    shortLabel: 'Couvreur',
    description: 'Travaux de toiture, étanchéité, zinguerie et pose de gouttières.',
  },
  carpenter: {
    code: 'carpenter',
    family: 'construction_trade',
    label: 'Charpentier',
    description: 'Fabrication et pose de charpentes bois ou métalliques et ossatures.',
  },
  joiner: {
    code: 'joiner',
    family: 'construction_trade',
    label: 'Menuisier poseur',
    shortLabel: 'Menuisier',
    description: 'Pose de portes, fenêtres, volets, parquets et fermetures du bâtiment.',
  },
  painter: {
    code: 'painter',
    family: 'construction_trade',
    label: 'Peintre en bâtiment',
    shortLabel: 'Peintre',
    description: 'Peintures intérieures/extérieures, revêtements muraux et finitions.',
  },
  plasterer: {
    code: 'plasterer',
    family: 'construction_trade',
    label: 'Plâtrier / Plaquiste',
    shortLabel: 'Plâtrier',
    description: 'Plâtrerie traditionnelle, cloisons sèches, faux plafonds et doublages.',
  },
  insulation_specialist: {
    code: 'insulation_specialist',
    family: 'construction_trade',
    label: 'Spécialiste isolation',
    shortLabel: 'Isolation',
    description: 'Isolation thermique et phonique intérieure, extérieure et combles.',
  },
  tiler: {
    code: 'tiler',
    family: 'construction_trade',
    label: 'Carreleur',
    description: 'Pose de carrelages, faïences, mosaïques et chapes intérieures/extérieures.',
  },
  earthworks_contractor: {
    code: 'earthworks_contractor',
    family: 'construction_trade',
    label: 'Terrassier / Travaux publics',
    shortLabel: 'Terrassier',
    description: 'Terrassement, VRD, viabilisation de terrains et excavations.',
  },
  facade_specialist: {
    code: 'facade_specialist',
    family: 'construction_trade',
    label: 'Façadier / Ravaleur',
    shortLabel: 'Façadier',
    description: 'Ravalement de façades, enduits projetés et traitement des murs extérieurs.',
  },
  locksmith: {
    code: 'locksmith',
    family: 'construction_trade',
    label: 'Serrurier / Métallier',
    shortLabel: 'Serrurier',
    description: 'Dépannage serrurerie, sécurisation, pose de serrures et métallerie.',
  },
  glazier: {
    code: 'glazier',
    family: 'construction_trade',
    label: 'Vitrier / Miroitier',
    shortLabel: 'Vitrier',
    description: 'Remplacement de vitrage, miroiterie et parois vitrées de sécurité.',
  },
  sanitation_specialist: {
    code: 'sanitation_specialist',
    family: 'construction_trade',
    label: 'Assainissement / Canalisateur',
    shortLabel: 'Assainissement',
    description: 'Réseaux d’assainissement individuel/collectif, fosses et curage.',
  },
  renovation_contractor: {
    code: 'renovation_contractor',
    family: 'construction_trade',
    label: 'Entreprise générale de rénovation',
    shortLabel: 'Rénovation générale',
    description: 'Tous corps d’état, coordination de chantiers et rénovation globale.',
  },
  pool_specialist: {
    code: 'pool_specialist',
    family: 'construction_trade',
    label: 'Pisciniste',
    description: 'Construction, installation, filtration et entretien de piscines et spas.',
  },

  // --- Architecture & Engineering ---
  architect: {
    code: 'architect',
    family: 'architecture_engineering',
    label: 'Architecte',
    description: 'Conception architecturale, permis de construire et suivi d’exécution.',
  },
  construction_project_manager: {
    code: 'construction_project_manager',
    family: 'architecture_engineering',
    label: 'Maître d’œuvre',
    description: 'Coordination technique, direction de travaux et ordonnancement.',
  },
  engineering_office: {
    code: 'engineering_office',
    family: 'architecture_engineering',
    label: 'Bureau d’études',
    description: 'Calculs de structure, fluides, thermique et études techniques bâtiment.',
  },
  quantity_surveyor: {
    code: 'quantity_surveyor',
    family: 'architecture_engineering',
    label: 'Économiste de la construction',
    description: 'Chiffrage de projets, métrés, DPGF et optimisation des coûts de construction.',
  },

  // --- Installation & Maintenance ---
  maintenance_technician: {
    code: 'maintenance_technician',
    family: 'installation_maintenance',
    label: 'Technicien de maintenance',
    shortLabel: 'Maintenance',
    description: 'Contrats d’entretien, maintenance préventive et curative multi-technique.',
  },
  technical_installer: {
    code: 'technical_installer',
    family: 'installation_maintenance',
    label: 'Installateur technique',
    shortLabel: 'Installateur',
    description: 'Pose d’équipements spécifiques, alarmes, domotique et bornes de recharge.',
  },

  // --- Automotive ---
  auto_mechanic: {
    code: 'auto_mechanic',
    family: 'automotive',
    label: 'Mécanicien automobile',
    shortLabel: 'Mécanicien auto',
    description: 'Entretien mécanique, révision, freinage, moteur et vidange automobile.',
  },
  auto_body_repairer: {
    code: 'auto_body_repairer',
    family: 'automotive',
    label: 'Carrossier',
    description: 'Réparation de carrosserie, débosselage et peinture automobile.',
  },
  auto_service_center: {
    code: 'auto_service_center',
    family: 'automotive',
    label: 'Garage / Centre automobile',
    shortLabel: 'Garage automobile',
    description: 'Atelier complet de mécanique, carrosserie et diagnostic automobile.',
  },

  // --- Device Repair ---
  phone_repairer: {
    code: 'phone_repairer',
    family: 'device_repair',
    label: 'Réparateur smartphones & tablettes',
    shortLabel: 'Réparateur téléphone',
    description: 'Remplacement d’écrans, batteries, connecteurs et micro-soudure mobile.',
  },
  computer_repairer: {
    code: 'computer_repairer',
    family: 'device_repair',
    label: 'Réparateur informatique',
    description: 'Dépannage PC/Mac, maintenance système, composants et récupération de données.',
  },
  appliance_repairer: {
    code: 'appliance_repairer',
    family: 'device_repair',
    label: 'Réparateur électroménager',
    description: 'Dépannage à domicile et atelier d’appareils électroménagers (GEM / PEM).',
  },
  electronics_repairer: {
    code: 'electronics_repairer',
    family: 'device_repair',
    label: 'Réparateur électronique',
    description: 'Diagnostic au composant, cartes électroniques et audio/vidéo.',
  },

  // --- Landscaping ---
  landscaper: {
    code: 'landscaper',
    family: 'landscaping_outdoor',
    label: 'Paysagiste',
    description: 'Création de jardins, terrasses, clôtures, élagage et entretien d’espaces verts.',
  },

  // --- Custom Manufacturing ---
  custom_manufacturer: {
    code: 'custom_manufacturer',
    family: 'custom_manufacturing',
    label: 'Artisan fabricant sur-mesure',
    shortLabel: 'Fabricant sur-mesure',
    description: 'Atelier de fabrication, menuiserie artisanale, ébénisterie et métallerie d’art.',
  },

  // --- Artisan Commerce ---
  artisan_retailer: {
    code: 'artisan_retailer',
    family: 'artisan_commerce',
    label: 'Artisan commerçant',
    description: 'Professionnels associant atelier de création/fabrication et point de vente.',
  },

  // --- Technical Services Fallback ---
  technical_service_provider: {
    code: 'technical_service_provider',
    family: 'technical_services',
    label: 'Prestataire de services techniques',
    shortLabel: 'Services techniques',
    description: 'Prestations et interventions techniques spécialisées sur site.',
  },
} as const satisfies Record<FieldServiceProfessionCode, FieldServiceProfession>;

const FIELD_SERVICE_PROFESSION_CODE_SET: ReadonlySet<string> = new Set(FIELD_SERVICE_PROFESSION_CODES);

export function isFieldServiceProfessionCode(value: string | null | undefined): value is FieldServiceProfessionCode {
  return typeof value === 'string' && FIELD_SERVICE_PROFESSION_CODE_SET.has(value);
}

export function getFieldServiceProfession(code: string | undefined | null): FieldServiceProfession | undefined {
  if (isFieldServiceProfessionCode(code)) {
    return FIELD_SERVICE_PROFESSIONS[code];
  }
  return undefined;
}
