export const PARAMEDICAL_PROFESSION_CODES = [
  'physiotherapist',
  'osteopath',
  'speech_therapist',
  'podiatrist',
  'occupational_therapist',
  'psychomotor_therapist',
  'dietitian',
] as const;

export type ParamedicalProfessionCode = typeof PARAMEDICAL_PROFESSION_CODES[number];

export interface ParamedicalProfession {
  code: ParamedicalProfessionCode;
  label: string;
  shortLabel?: string;
}

export const PARAMEDICAL_PROFESSIONS = {
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
} as const satisfies Record<ParamedicalProfessionCode, ParamedicalProfession>;

const PARAMEDICAL_PROFESSION_CODE_SET: ReadonlySet<string> = new Set<string>(PARAMEDICAL_PROFESSION_CODES);

export function isParamedicalProfessionCode(value: string | null | undefined): value is ParamedicalProfessionCode {
  return typeof value === 'string' && PARAMEDICAL_PROFESSION_CODE_SET.has(value);
}

export function getParamedicalProfession(code: string | undefined | null): ParamedicalProfession | undefined {
  if (isParamedicalProfessionCode(code)) {
    return PARAMEDICAL_PROFESSIONS[code];
  }
  return undefined;
}
