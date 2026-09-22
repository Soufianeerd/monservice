export const REGISTRATION_SECTOR_CODES = [
  'health',
  'field_services',
  'freelance',
  'other',
] as const;

export type RegistrationSectorCode = typeof REGISTRATION_SECTOR_CODES[number];

export const REGISTRATION_SECTORS: Record<RegistrationSectorCode, { label: string }> = {
  health: { label: 'Santé & Bien-être' },
  field_services: { label: 'BTP, Artisanat & Services techniques' },
  freelance: { label: 'Consultant & Services professionnels' },
  other: { label: 'Autre' },
} as const;

const REGISTRATION_SECTOR_CODE_SET: ReadonlySet<string> = new Set(REGISTRATION_SECTOR_CODES);

export function isRegistrationSectorCode(value: string | null | undefined): value is RegistrationSectorCode {
  return typeof value === 'string' && REGISTRATION_SECTOR_CODE_SET.has(value);
}

