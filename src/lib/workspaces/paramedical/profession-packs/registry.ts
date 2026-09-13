import type { ParamedicalProfessionCode } from '../professions';
import { isParamedicalProfessionCode } from '../professions';
import type { ParamedicalProfessionPack } from './types';
import { PHYSIOTHERAPIST_PACK } from './physiotherapist';
import { OSTEOPATH_PACK } from './osteopath';
import { SPEECH_THERAPIST_PACK } from './speech-therapist';
import { PODIATRIST_PACK } from './podiatrist';
import { OCCUPATIONAL_THERAPIST_PACK } from './occupational-therapist';
import { PSYCHOMOTOR_THERAPIST_PACK } from './psychomotor-therapist';
import { DIETITIAN_PACK } from './dietitian';
import { AppError } from '@/lib/errors';

export const PARAMEDICAL_PROFESSION_PACKS = {
  physiotherapist: PHYSIOTHERAPIST_PACK,
  osteopath: OSTEOPATH_PACK,
  speech_therapist: SPEECH_THERAPIST_PACK,
  podiatrist: PODIATRIST_PACK,
  occupational_therapist: OCCUPATIONAL_THERAPIST_PACK,
  psychomotor_therapist: PSYCHOMOTOR_THERAPIST_PACK,
  dietitian: DIETITIAN_PACK,
} as const satisfies Record<ParamedicalProfessionCode, ParamedicalProfessionPack>;

export function getParamedicalProfessionPack(
  code: string | null | undefined,
): ParamedicalProfessionPack | undefined {
  if (isParamedicalProfessionCode(code)) {
    return PARAMEDICAL_PROFESSION_PACKS[code];
  }
  return undefined;
}

export function requireParamedicalProfessionPack(
  code: string | null | undefined,
): ParamedicalProfessionPack {
  const pack = getParamedicalProfessionPack(code);
  if (!pack) {
    throw new AppError(
      `Aucun pack professionnel paramédical configuré pour le code "${code}"`,
      400,
      'INVALID_PROFESSION_PACK',
    );
  }
  return pack;
}

export * from './types';
export {
  PHYSIOTHERAPIST_PACK,
  OSTEOPATH_PACK,
  SPEECH_THERAPIST_PACK,
  PODIATRIST_PACK,
  OCCUPATIONAL_THERAPIST_PACK,
  PSYCHOMOTOR_THERAPIST_PACK,
  DIETITIAN_PACK,
};
