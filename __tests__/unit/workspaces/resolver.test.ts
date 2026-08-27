import { describe, expect, it } from 'vitest';
import { resolveWorkspace } from '../../../src/lib/workspaces/resolver';
import { GENERIC_WORKSPACE_CONFIG } from '../../../src/lib/workspaces/generic/config';
import { PARAMEDICAL_CAPABILITIES } from '../../../src/lib/workspaces/paramedical/capabilities';
import { PARAMEDICAL_TERMINOLOGY } from '../../../src/lib/workspaces/paramedical/terminology';
import { PARAMEDICAL_PROFESSION_CODES, isParamedicalProfessionCode, PARAMEDICAL_PROFESSIONS } from '../../../src/lib/workspaces/paramedical/professions';
import { WORKSPACE_CAPABILITY_CODES } from '../../../src/lib/workspaces/types';

describe('Workspace Resolver', () => {
  it('should resolve to generic config when no context is provided', () => {
    const config = resolveWorkspace();
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to generic config when context is null', () => {
    const config = resolveWorkspace(null);
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to generic config when context is an empty object', () => {
    const config = resolveWorkspace({});
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to generic config for non-health sector', () => {
    const config = resolveWorkspace({ sector: 'artisan' });
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to paramedical config for health sector (no profession)', () => {
    const config = resolveWorkspace({ sector: 'health' });
    expect(config.type).toBe('paramedical');
    expect(config.label).toBe('Espace Paramédical'); // default fallback when no profession
    if (config.type === 'paramedical') {
      expect(config.profession).toBeUndefined();
    }
    expect(config.capabilities).toEqual(PARAMEDICAL_CAPABILITIES);
    expect(config.terminology).toEqual(PARAMEDICAL_TERMINOLOGY);
  });

  it('should resolve to paramedical config with safe fallback for unknown profession', () => {
    const config = resolveWorkspace({ sector: 'health', profession: 'unknown_profession' });
    expect(config.type).toBe('paramedical');
    expect(config.label).toBe('Espace Paramédical');
    if (config.type === 'paramedical') {
      expect(config.profession).toBeUndefined();
    }
  });

  PARAMEDICAL_PROFESSION_CODES.forEach((code) => {
    it(`should resolve to paramedical config with specific profession (${code})`, () => {
      const config = resolveWorkspace({ sector: 'health', profession: code });
      expect(config.type).toBe('paramedical');
      if (config.type === 'paramedical') {
        expect(config.profession).toBe(code);
      }
    });
  });
});

describe('Workspace Contracts', () => {
  it('should not contain duplicate paramedical profession codes', () => {
    const uniqueCodes = new Set(PARAMEDICAL_PROFESSION_CODES);
    expect(uniqueCodes.size).toBe(PARAMEDICAL_PROFESSION_CODES.length);
  });

  it('registry keys should exactly match the profession code', () => {
    for (const code of PARAMEDICAL_PROFESSION_CODES) {
      expect(PARAMEDICAL_PROFESSIONS[code].code).toBe(code);
    }
  });

  it('type guard should correctly identify official codes', () => {
    PARAMEDICAL_PROFESSION_CODES.forEach((code) => {
      expect(isParamedicalProfessionCode(code)).toBe(true);
    });
  });

  it('type guard should reject unknown codes', () => {
    expect(isParamedicalProfessionCode('hacker')).toBe(false);
    expect(isParamedicalProfessionCode('')).toBe(false);
    expect(isParamedicalProfessionCode(null)).toBe(false);
    expect(isParamedicalProfessionCode(undefined)).toBe(false);
  });

  it('should not contain duplicate capabilities in the official catalogue', () => {
    const uniqueCapabilities = new Set(WORKSPACE_CAPABILITY_CODES);
    expect(uniqueCapabilities.size).toBe(WORKSPACE_CAPABILITY_CODES.length);
  });

  it('paramedical config should not contain duplicate capabilities', () => {
    const uniqueParamedicalCaps = new Set(PARAMEDICAL_CAPABILITIES);
    expect(uniqueParamedicalCaps.size).toBe(PARAMEDICAL_CAPABILITIES.length);
  });

  it('paramedical capabilities should only contain official workspace capabilities', () => {
    PARAMEDICAL_CAPABILITIES.forEach((cap) => {
      expect(WORKSPACE_CAPABILITY_CODES).toContain(cap);
    });
  });
});
