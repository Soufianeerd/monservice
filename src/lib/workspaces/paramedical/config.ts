import { ParamedicalWorkspaceConfig } from '../types';
import { PARAMEDICAL_CAPABILITIES } from './capabilities';
import { PARAMEDICAL_TERMINOLOGY } from './terminology';
import { getParamedicalProfession } from './professions';
import { getParamedicalProfessionPack } from './profession-packs/registry';

export function getParamedicalWorkspaceConfig(professionCode?: string | null): ParamedicalWorkspaceConfig {
  const profession = getParamedicalProfession(professionCode);
  const professionPack = getParamedicalProfessionPack(professionCode);

  return {
    type: 'paramedical',
    label: professionPack?.label || profession?.label || 'Espace Paramédical',
    profession: profession?.code,
    professionPack,
    capabilities: PARAMEDICAL_CAPABILITIES,
    terminology: PARAMEDICAL_TERMINOLOGY,
  };
}
