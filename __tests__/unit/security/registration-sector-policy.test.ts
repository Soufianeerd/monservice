import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isSectorOpenForRegistration,
  openRegistrationSectorCodes,
  parseClosedRegistrationSectors,
} from '@/lib/registration/options';

describe('ouverture des inscriptions par secteur', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('laisse tous les secteurs ouverts par défaut', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS', '');
    expect(openRegistrationSectorCodes()).toEqual(['health', 'field_services', 'freelance', 'other']);
    expect(isSectorOpenForRegistration('health')).toBe(true);
  });

  it('ferme le paramédical quand la production le demande', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS', ' Health ');
    expect(openRegistrationSectorCodes()).toEqual(['field_services', 'freelance', 'other']);
    expect(isSectorOpenForRegistration('health')).toBe(false);
    expect(isSectorOpenForRegistration('field_services')).toBe(true);
    expect(isSectorOpenForRegistration(undefined)).toBe(true);
  });

  it('ignore les codes inconnus', () => {
    expect(parseClosedRegistrationSectors('health,inconnu,,other')).toEqual(['health', 'other']);
    expect(parseClosedRegistrationSectors(undefined)).toEqual([]);
  });
});
