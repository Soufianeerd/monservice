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


// Ouverture des inscriptions par secteur. `NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS`
// (codes séparés par des virgules, ex. `health`) ferme la création de nouveaux
// espaces pour ces secteurs : en production, le paramédical reste fermé tant que
// l'hébergement HDS n'est pas démontré. Les organisations existantes ne sont pas
// touchées. Le serveur fait autorité ; l'interface ne fait que masquer l'option.
export function parseClosedRegistrationSectors(raw: string | null | undefined): RegistrationSectorCode[] {
  if (!raw) return [];
  const requested = new Set(raw.split(',').map((code) => code.trim().toLowerCase()));
  return REGISTRATION_SECTOR_CODES.filter((code) => requested.has(code));
}

export function closedRegistrationSectors(): RegistrationSectorCode[] {
  return parseClosedRegistrationSectors(process.env.NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS);
}

export function openRegistrationSectorCodes(): RegistrationSectorCode[] {
  const closed = new Set<string>(closedRegistrationSectors());
  return REGISTRATION_SECTOR_CODES.filter((code) => !closed.has(code));
}

export function isSectorOpenForRegistration(sector: string | null | undefined): boolean {
  if (!sector) return true;
  return !closedRegistrationSectors().some((code) => code === sector);
}

export const CLOSED_SECTOR_MESSAGE = 'Les inscriptions pour ce secteur ne sont pas encore ouvertes.';
