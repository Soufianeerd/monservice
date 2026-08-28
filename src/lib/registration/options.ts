export const REGISTRATION_SECTOR_CODES = [
  'health',
  'freelance',
  'artisan',
  'other',
] as const;

export type RegistrationSectorCode = typeof REGISTRATION_SECTOR_CODES[number];

export const REGISTRATION_SECTORS: Record<RegistrationSectorCode, { label: string }> = {
  health: { label: 'Santé & Bien-être' },
  freelance: { label: 'Consultant & Freelance' },
  artisan: { label: 'Artisan & Bâtiment' },
  other: { label: 'Autre' },
} as const;

export function isRegistrationSectorCode(value: string | null | undefined): value is RegistrationSectorCode {
  return typeof value === 'string' && REGISTRATION_SECTOR_CODES.includes(value as RegistrationSectorCode);
}
