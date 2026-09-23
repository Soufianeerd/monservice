import { FieldServiceWorkspaceConfig } from '../types';
import { FIELD_SERVICE_CAPABILITIES } from './capabilities';
import { DEFAULT_FIELD_SERVICE_TERMINOLOGY, FAMILY_DEFAULT_TERMINOLOGY, FieldServiceTerminology } from './terminology';
import { getFieldServiceProfession } from './professions';
import { getFieldServiceProfessionPack } from './profession-packs/registry';

export function getFieldServiceWorkspaceConfig(professionCode?: string | null): FieldServiceWorkspaceConfig {
  const profession = getFieldServiceProfession(professionCode);
  const professionPack = getFieldServiceProfessionPack(professionCode);
  const familyDefaultTerminology = profession?.family
    ? FAMILY_DEFAULT_TERMINOLOGY[profession.family]
    : DEFAULT_FIELD_SERVICE_TERMINOLOGY;

  const terminology: FieldServiceTerminology = {
    ...DEFAULT_FIELD_SERVICE_TERMINOLOGY,
    ...familyDefaultTerminology,
    ...(professionPack?.terminology ?? {}),
  };

  if (!terminology.operationSingular) {
    terminology.operationSingular = terminology.workSingular || 'Intervention';
  }
  if (!terminology.operationPlural) {
    terminology.operationPlural = terminology.workPlural || 'Interventions';
  }
  if (!terminology.siteSingular) {
    terminology.siteSingular = 'Chantier / Adresse';
  }
  if (!terminology.sitePlural) {
    terminology.sitePlural = 'Chantiers / Adresses';
  }

  return {
    type: 'field_service',
    label: professionPack?.label || profession?.label || 'Espace BTP & Services Techniques',
    profession: profession?.code,
    professionPack,
    businessFamily: profession?.family,
    capabilities: FIELD_SERVICE_CAPABILITIES,
    terminology,
  };
}
