import { WorkspaceConfig } from '../types';

export const GENERIC_WORKSPACE_CONFIG: WorkspaceConfig = {
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
};
