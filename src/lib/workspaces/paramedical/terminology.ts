import { WorkspaceTerminology } from '../types';

export const PARAMEDICAL_TERMINOLOGY = {
  customerSingular: 'Patient',
  customerPlural: 'Patients',
  appointmentSingular: 'Séance',
  appointmentPlural: 'Séances',
  serviceSingular: 'Consultation',
  servicePlural: 'Consultations',
} as const satisfies Readonly<WorkspaceTerminology>;
