export type ParamedicalProfessionCode =
  | 'physiotherapist'
  | 'osteopath'
  | 'speech_therapist'
  | 'podiatrist'
  | 'occupational_therapist'
  | 'psychomotor_therapist'
  | 'dietitian';

export interface ParamedicalProfession {
  code: ParamedicalProfessionCode;
  label: string;
  shortLabel?: string;
}

export const PARAMEDICAL_PROFESSIONS: Record<ParamedicalProfessionCode, ParamedicalProfession> = {
  physiotherapist: {
    code: 'physiotherapist',
    label: 'Masseur-Kinésithérapeute',
    shortLabel: 'Kinésithérapeute',
  },
  osteopath: {
    code: 'osteopath',
    label: 'Ostéopathe',
  },
  speech_therapist: {
    code: 'speech_therapist',
    label: 'Orthophoniste',
  },
  podiatrist: {
    code: 'podiatrist',
    label: 'Pédicure-Podologue',
    shortLabel: 'Podologue',
  },
  occupational_therapist: {
    code: 'occupational_therapist',
    label: 'Ergothérapeute',
  },
  psychomotor_therapist: {
    code: 'psychomotor_therapist',
    label: 'Psychomotricien',
  },
  dietitian: {
    code: 'dietitian',
    label: 'Diététicien',
  },
};

export function getParamedicalProfession(code: string | undefined | null): ParamedicalProfession | undefined {
  if (!code) return undefined;
  return PARAMEDICAL_PROFESSIONS[code as ParamedicalProfessionCode];
}
