import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { readStorageConfig } from '@/lib/storage/storage-config';

describe('readStorageConfig', () => {
  it('préfère les noms NEON_STORAGE_* aux AWS_* réservés par Lambda', () => {
    const config = readStorageConfig({
      NEON_STORAGE_ENDPOINT: 'https://storage.example', NEON_STORAGE_REGION: 'eu-central-1',
      NEON_STORAGE_ACCESS_KEY_ID: 'neon-id', NEON_STORAGE_SECRET_ACCESS_KEY: 'neon-secret',
      AWS_REGION: 'us-east-2', AWS_ACCESS_KEY_ID: 'lambda-id', AWS_SECRET_ACCESS_KEY: 'lambda-secret',
    });
    expect(config).toEqual({ endpoint: 'https://storage.example', region: 'eu-central-1', accessKeyId: 'neon-id', secretAccessKey: 'neon-secret' });
  });

  it('reste compatible avec les noms AWS_*', () => {
    const config = readStorageConfig({
      AWS_ENDPOINT_URL_S3: 'https://storage.example', AWS_REGION: 'eu-central-1', AWS_ACCESS_KEY_ID: 'id', AWS_SECRET_ACCESS_KEY: 'secret',
    });
    expect(config?.accessKeyId).toBe('id');
  });

  it('refuse une configuration incomplète', () => {
    expect(readStorageConfig({ NEON_STORAGE_ENDPOINT: 'https://storage.example' })).toBeNull();
  });
});
