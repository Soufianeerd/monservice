import { ParamedicalWorkspaceConfig } from '../types';
import { PARAMEDICAL_CAPABILITIES } from './capabilities';
import { PARAMEDICAL_TERMINOLOGY } from './terminology';
import { getParamedicalProfession } from './professions';

export function getParamedicalWorkspaceConfig(professionCode?: string | null): ParamedicalWorkspaceConfig {
  const profession = getParamedicalProfession(professionCode);

  return {
    type: 'paramedical',
    label: profession?.label || 'Espace Paramédical',
    profession: profession?.code,
    capabilities: PARAMEDICAL_CAPABILITIES,
    terminology: PARAMEDICAL_TERMINOLOGY,
  };
}
