import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('Identité de l’éditeur', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('n’invente rien quand la configuration est vide', async () => {
    const { getPublisher, isPublisherComplete } = await import('@/lib/legal/publisher');
    vi.stubEnv('PUBLISHER_NAME', '');
    const publisher = getPublisher();
    expect(publisher.name).toBeNull();
    expect(publisher.siret).toBeNull();
    expect(isPublisherComplete(publisher)).toBe(false);
  });

  it('reprend l’identité configurée', async () => {
    const { getPublisher, isPublisherComplete } = await import('@/lib/legal/publisher');
    vi.stubEnv('PUBLISHER_NAME', 'Éditeur Test');
    vi.stubEnv('PUBLISHER_ADDRESS', '1 rue Test, 57000 Metz');
    vi.stubEnv('PUBLISHER_EMAIL', 'contact@exemple.fr');
    vi.stubEnv('PUBLISHER_SIRET', '000 000 000 00000');
    vi.stubEnv('PUBLISHER_DIRECTOR', 'Directeur Test');
    vi.stubEnv('PUBLISHER_VAT_EXEMPT', 'true');
    const publisher = getPublisher();
    expect(publisher.name).toBe('Éditeur Test');
    expect(publisher.vatExempt).toBe(true);
    expect(isPublisherComplete(publisher)).toBe(true);
  });
});
