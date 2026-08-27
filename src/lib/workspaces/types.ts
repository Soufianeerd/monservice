export type WorkspaceType = 'generic' | 'paramedical';

export const WORKSPACE_CAPABILITY_CODES = [
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
  'billing',
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
}

export type WorkspaceConfig = GenericWorkspaceConfig | ParamedicalWorkspaceConfig;

export interface OrganizationContext {
  sector?: string | null;
  profession?: string | null;
  country?: string | null;
}
