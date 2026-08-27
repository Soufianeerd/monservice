export type WorkspaceType = 'generic' | 'paramedical';

export type WorkspaceCapability = string;

export interface WorkspaceTerminology {
  customerSingular: string;
  customerPlural: string;
  appointmentSingular?: string;
  appointmentPlural?: string;
  [key: string]: string | undefined;
}

export interface WorkspaceConfig {
  type: WorkspaceType;
  label: string;
  profession?: string;
  capabilities: WorkspaceCapability[];
  terminology: WorkspaceTerminology;
}

export interface OrganizationContext {
  sector?: string | null;
  profession?: string | null;
  country?: string | null;
}
