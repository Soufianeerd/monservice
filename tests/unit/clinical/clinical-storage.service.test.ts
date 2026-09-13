import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError } from '@/lib/errors';
import { createClient as createSupabaseAdminClient, SupabaseClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
  SupabaseClient: class {},
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('ClinicalStorageService privileged cleanup & contracts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws STORAGE_ADMIN_CONFIGURATION_MISSING when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';

    const { clinicalStorageService } = await import('@/lib/services/clinical-storage.service');

    await expect(
      clinicalStorageService.removeFileAfterFailedMetadataWrite('org/prac/pat/doc/file.pdf'),
    ).rejects.toThrow(AppError);

    try {
      await clinicalStorageService.removeFileAfterFailedMetadataWrite('org/prac/pat/doc/file.pdf');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      if (err instanceof AppError) {
        expect(err.code).toBe('STORAGE_ADMIN_CONFIGURATION_MISSING');
        expect(err.statusCode).toBe(500);
      }
    }

    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('throws STORAGE_ADMIN_CONFIGURATION_MISSING when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    const { clinicalStorageService } = await import('@/lib/services/clinical-storage.service');

    await expect(
      clinicalStorageService.removeFileAfterFailedMetadataWrite('org/prac/pat/doc/file.pdf'),
    ).rejects.toThrow(AppError);

    try {
      await clinicalStorageService.removeFileAfterFailedMetadataWrite('org/prac/pat/doc/file.pdf');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      if (err instanceof AppError) {
        expect(err.code).toBe('STORAGE_ADMIN_CONFIGURATION_MISSING');
        expect(err.statusCode).toBe(500);
      }
    }
  });

  it('calls adminClient.storage.from.remove when configuration is valid', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockFrom = vi.fn().mockReturnValue({ remove: mockRemove });

    const mockClient = Object.assign(Object.create(SupabaseClient.prototype), {
      storage: { from: mockFrom },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient);

    const { clinicalStorageService } = await import('@/lib/services/clinical-storage.service');

    await clinicalStorageService.removeFileAfterFailedMetadataWrite('org/prac/pat/doc/file.pdf');

    expect(createSupabaseAdminClient).toHaveBeenCalledWith(
      'http://127.0.0.1:54321',
      'mock-service-role-key',
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    );
    expect(mockFrom).toHaveBeenCalledWith('clinical-documents');
    expect(mockRemove).toHaveBeenCalledWith(['org/prac/pat/doc/file.pdf']);
  });

  it('throws STORAGE_CLEANUP_FAILED when storage admin remove fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

    const mockRemove = vi.fn().mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    const mockFrom = vi.fn().mockReturnValue({ remove: mockRemove });

    const mockClient = Object.assign(Object.create(SupabaseClient.prototype), {
      storage: { from: mockFrom },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient);

    const { clinicalStorageService } = await import('@/lib/services/clinical-storage.service');

    try {
      await clinicalStorageService.removeFileAfterFailedMetadataWrite('org/prac/pat/doc/file.pdf');
      expect.fail('Expected removeFileAfterFailedMetadataWrite to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      if (err instanceof AppError) {
        expect(err.code).toBe('STORAGE_CLEANUP_FAILED');
        expect(err.statusCode).toBe(500);
      }
    }
  });
});
