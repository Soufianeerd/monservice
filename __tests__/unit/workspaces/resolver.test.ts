import { describe, expect, it } from 'vitest';
import { resolveWorkspace } from '../../../src/lib/workspaces/resolver';
import { GENERIC_WORKSPACE_CONFIG } from '../../../src/lib/workspaces/generic/config';
import { PARAMEDICAL_CAPABILITIES } from '../../../src/lib/workspaces/paramedical/capabilities';
import { PARAMEDICAL_TERMINOLOGY } from '../../../src/lib/workspaces/paramedical/terminology';

describe('Workspace Resolver', () => {
  it('should resolve to generic config when no context is provided', () => {
    const config = resolveWorkspace();
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to generic config when context is null', () => {
    const config = resolveWorkspace(null);
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to generic config for non-health sector', () => {
    const config = resolveWorkspace({ sector: 'artisan' });
    expect(config).toEqual(GENERIC_WORKSPACE_CONFIG);
  });

  it('should resolve to paramedical config for health sector', () => {
    const config = resolveWorkspace({ sector: 'health' });
    expect(config.type).toBe('paramedical');
    expect(config.label).toBe('Espace Paramédical'); // default fallback when no profession
    expect(config.profession).toBeUndefined();
    expect(config.capabilities).toEqual(PARAMEDICAL_CAPABILITIES);
    expect(config.terminology).toEqual(PARAMEDICAL_TERMINOLOGY);
  });

  it('should resolve to paramedical config with specific profession (physiotherapist)', () => {
    const config = resolveWorkspace({ sector: 'health', profession: 'physiotherapist' });
    expect(config.type).toBe('paramedical');
    expect(config.label).toBe('Masseur-Kinésithérapeute');
    expect(config.profession).toBe('physiotherapist');
  });

  it('should resolve to paramedical config with specific profession (osteopath)', () => {
    const config = resolveWorkspace({ sector: 'health', profession: 'osteopath' });
    expect(config.type).toBe('paramedical');
    expect(config.label).toBe('Ostéopathe');
    expect(config.profession).toBe('osteopath');
  });

  it('should resolve to paramedical config with safe fallback for unknown profession', () => {
    const config = resolveWorkspace({ sector: 'health', profession: 'unknown_profession' });
    expect(config.type).toBe('paramedical');
    expect(config.label).toBe('Espace Paramédical');
    expect(config.profession).toBeUndefined(); // It falls back safely to undefined profession
  });
});
