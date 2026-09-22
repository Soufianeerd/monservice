export type WorkspaceType = 'generic' | 'paramedical' | 'field_service';

export const WORKSPACE_CAPABILITY_CODES = [
  // Core & Shared CRM
  'clients',
  'deals',
  'quotes',
  'invoices',
  'products',
  'calendar',
  'tasks',
  'messaging',
  'billing',
  // Paramedical
  'patients',
  'clinicalRecords',
  'careEpisodes',
  'appointments',
  'waitingList',
  'clinicalForms',
  'exercises',
  'measurements',
  'nutritionJournal',
  'orthotics',
  'patientPortal',
] as const;

export type WorkspaceCapability = typeof WORKSPACE_CAPABILITY_CODES[number];

export interface WorkspaceTerminology {
  customerSingular: string;
  customerPlural: string;
  appointmentSingular?: string;
  appointmentPlural?: string;
  serviceSingular?: string;
  servicePlural?: string;
  workSingular?: string;
  workPlural?: string;
}

export interface BaseWorkspaceConfig {
  type: WorkspaceType;
  label: string;
  capabilities: readonly WorkspaceCapability[];
  terminology: Readonly<WorkspaceTerminology>;
}

export interface GenericWorkspaceConfig extends BaseWorkspaceConfig {
  type: 'generic';
}

export interface ParamedicalWorkspaceConfig extends BaseWorkspaceConfig {
  type: 'paramedical';
  profession?: import('./paramedical/professions').ParamedicalProfessionCode;
  professionPack?: import('./paramedical/profession-packs/types').ParamedicalProfessionPack;
}

export interface FieldServiceWorkspaceConfig extends BaseWorkspaceConfig {
  type: 'field_service';
  profession?: import('./field-service/professions').FieldServiceProfessionCode;
  professionPack?: import('./field-service/profession-packs/types').FieldServiceProfessionPack;
  businessFamily?: import('./field-service/families').FieldServiceBusinessFamilyCode;
}

export type WorkspaceConfig =
  | GenericWorkspaceConfig
  | ParamedicalWorkspaceConfig
  | FieldServiceWorkspaceConfig;

export interface OrganizationContext {
  sector?: string | null;
  profession?: string | null;
  country?: string | null;
}

