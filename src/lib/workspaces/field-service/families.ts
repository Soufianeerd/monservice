export const FIELD_SERVICE_BUSINESS_FAMILY_CODES = [
  'construction_trade',
  'architecture_engineering',
  'installation_maintenance',
  'automotive',
  'device_repair',
  'landscaping_outdoor',
  'custom_manufacturing',
  'artisan_commerce',
  'technical_services',
] as const;

export type FieldServiceBusinessFamilyCode = typeof FIELD_SERVICE_BUSINESS_FAMILY_CODES[number];

export interface FieldServiceBusinessFamily {
  code: FieldServiceBusinessFamilyCode;
  label: string;
  description: string;
}

export const FIELD_SERVICE_BUSINESS_FAMILIES: Record<FieldServiceBusinessFamilyCode, FieldServiceBusinessFamily> = {
  construction_trade: {
    code: 'construction_trade',
    label: 'BTP & Construction',
    description: 'Artisans du gros œuvre, second œuvre et rénovation générale.',
  },
  architecture_engineering: {
    code: 'architecture_engineering',
    label: 'Architecture & Ingénierie',
    description: 'Conception, maîtrise d’œuvre, études techniques et économie du bâtiment.',
  },
  installation_maintenance: {
    code: 'installation_maintenance',
    label: 'Installation & Maintenance',
    description: 'Maintenance technique, dépannage d’équipements et interventions.',
  },
  automotive: {
    code: 'automotive',
    label: 'Automobile & Mobilité',
    description: 'Mécanique, carrosserie, centres automobiles et entretien de véhicules.',
  },
  device_repair: {
    code: 'device_repair',
    label: 'Réparation Appareils',
    description: 'Réparation de smartphones, informatique, électroménager et électronique.',
  },
  landscaping_outdoor: {
    code: 'landscaping_outdoor',
    label: 'Paysage & Extérieur',
    description: 'Aménagement paysager, création et entretien d’espaces verts.',
  },
  custom_manufacturing: {
    code: 'custom_manufacturing',
    label: 'Fabrication Artisanale',
    description: 'Fabrication sur mesure, ateliers de menuiserie, agencement et métallerie.',
  },
  artisan_commerce: {
    code: 'artisan_commerce',
    label: 'Commerce Artisanal',
    description: 'Professionnels associant fabrication artisanale, commandes et vente.',
  },
  technical_services: {
    code: 'technical_services',
    label: 'Services Techniques',
    description: 'Prestations et services techniques spécialisés de terrain.',
  },
} as const satisfies Record<FieldServiceBusinessFamilyCode, FieldServiceBusinessFamily>;

const FIELD_SERVICE_BUSINESS_FAMILY_CODE_SET: ReadonlySet<string> = new Set(FIELD_SERVICE_BUSINESS_FAMILY_CODES);

export function isFieldServiceBusinessFamilyCode(value: string | null | undefined): value is FieldServiceBusinessFamilyCode {
  return typeof value === 'string' && FIELD_SERVICE_BUSINESS_FAMILY_CODE_SET.has(value);
}
