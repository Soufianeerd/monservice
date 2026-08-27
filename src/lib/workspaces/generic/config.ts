import { GenericWorkspaceConfig } from '../types';

export const GENERIC_WORKSPACE_CONFIG: GenericWorkspaceConfig = {
  type: 'generic',
  label: 'Espace Professionnel',
  capabilities: [], // Defined as needed later
  terminology: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    appointmentSingular: 'Rendez-vous',
    appointmentPlural: 'Rendez-vous',
    serviceSingular: 'Service',
    servicePlural: 'Services',
  },
} as const;
