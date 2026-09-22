import { FieldServiceWorkspaceConfig } from '../types';
import { FIELD_SERVICE_CAPABILITIES } from './capabilities';
import { DEFAULT_FIELD_SERVICE_TERMINOLOGY } from './terminology';
import { getFieldServiceProfession } from './professions';
import { getFieldServiceProfessionPack } from './profession-packs/registry';

export function getFieldServiceWorkspaceConfig(professionCode?: string | null): FieldServiceWorkspaceConfig {
  const profession = getFieldServiceProfession(professionCode);
  const professionPack = getFieldServiceProfessionPack(professionCode);

  return {
    type: 'field_service',
    label: professionPack?.label || profession?.label || 'Espace BTP & Services Techniques',
    profession: profession?.code,
    professionPack,
    businessFamily: profession?.family,
    capabilities: FIELD_SERVICE_CAPABILITIES,
    terminology: professionPack?.terminology ?? DEFAULT_FIELD_SERVICE_TERMINOLOGY,
  };
}
