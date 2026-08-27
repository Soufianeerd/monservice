import { WorkspaceCapability } from '../types';

export const PARAMEDICAL_CAPABILITIES = [
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
  'patientPortal'
] as const satisfies readonly WorkspaceCapability[];
