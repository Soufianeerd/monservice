import { WorkspaceCapability } from '../types';

export const PARAMEDICAL_IMPLEMENTED_CAPABILITIES = [
  'patients',
  'clinicalRecords',
  'careEpisodes',
  'appointments',
  'waitingList',
  'clinicalForms',
  'measurements',
  'billing',
] as const satisfies readonly WorkspaceCapability[];

export const PARAMEDICAL_FUTURE_CAPABILITIES = [
  'exercises',
  'nutritionJournal',
  'orthotics',
  'patientPortal',
] as const satisfies readonly WorkspaceCapability[];

/**
 * Capacités actives réellement déployées et utilisables pour l'espace paramédical.
 */
export const PARAMEDICAL_CAPABILITIES = PARAMEDICAL_IMPLEMENTED_CAPABILITIES;
