import { GenericWorkspaceConfig } from '../types';
import { GENERIC_PROFESSIONS, GENERIC_PROFESSION_FAMILIES, isGenericProfessionCode } from './professions';

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

/**
 * Espace général adapté au métier déclaré : libellé de l'espace et unité de
 * travail (dossier, projet, mission, prestation, intervention).
 */
export function getGenericWorkspaceConfig(profession?: string | null): GenericWorkspaceConfig {
  if (!isGenericProfessionCode(profession)) return GENERIC_WORKSPACE_CONFIG;
  const metier = GENERIC_PROFESSIONS[profession];
  const family = GENERIC_PROFESSION_FAMILIES[metier.family];
  return {
    ...GENERIC_WORKSPACE_CONFIG,
    label: `Espace ${metier.label}`,
    profession,
    professionFamily: metier.family,
    terminology: {
      ...GENERIC_WORKSPACE_CONFIG.terminology,
      workSingular: family.workSingular,
      workPlural: family.workPlural,
    },
  };
}
