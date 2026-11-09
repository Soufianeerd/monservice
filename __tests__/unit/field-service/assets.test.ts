import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFieldServiceAssetSchema,
  updateFieldServiceAssetSchema,
  listFieldServiceAssetsSchema,
  workOrderAssetLinkSchema,
} from '../../../src/lib/validation/field-service-assets.schemas';
import {
  FIELD_SERVICE_ASSET_CATEGORIES,
  FIELD_SERVICE_ASSET_CATEGORY_LABELS,
  FIELD_SERVICE_ASSET_STATUSES,
  FIELD_SERVICE_ASSET_STATUS_LABELS,
  getWarrantyState,
} from '../../../src/lib/workspaces/field-service/assets';
import { AppError } from '../../../src/lib/errors';

const service = vi.hoisted(() => ({
  createFieldServiceAsset: vi.fn(),
  updateFieldServiceAsset: vi.fn(),
  linkAssetToWorkOrder: vi.fn(),
  unlinkAssetFromWorkOrder: vi.fn(),
}));
const requireFieldServiceContext = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/workspaces/field-service/context', () => ({ requireFieldServiceContext }));
vi.mock('@/lib/services/field-service-assets.service', () => service);

import {
  createFieldServiceAssetAction,
  linkAssetToWorkOrderAction,
  unlinkAssetFromWorkOrderAction,
  updateFieldServiceAssetAction,
} from '../../../src/app/actions/field-service-assets.actions';

describe('Session 19 — Customer assets', () => {
  describe('reference data', () => {
    it('has a French label for every category and status', () => {
      for (const c of FIELD_SERVICE_ASSET_CATEGORIES) expect(FIELD_SERVICE_ASSET_CATEGORY_LABELS[c]).toBeTruthy();
      for (const s of FIELD_SERVICE_ASSET_STATUSES) expect(FIELD_SERVICE_ASSET_STATUS_LABELS[s]).toBeTruthy();
    });

    it('computes the warranty state against a reference date', () => {
      expect(getWarrantyState(null, '2026-11-09')).toBe('none');
      expect(getWarrantyState('2026-11-08', '2026-11-09')).toBe('expired');
      expect(getWarrantyState('2026-11-09', '2026-11-09')).toBe('expiring');
      expect(getWarrantyState('2027-01-08', '2026-11-09')).toBe('expiring');
      expect(getWarrantyState('2027-01-09', '2026-11-09')).toBe('valid');
    });
  });

  describe('validation', () => {
    const valid = {
      clientId: 'cli-1',
      category: 'heating',
      label: '  Chaudière gaz  ',
      manufacturer: 'Viessmann',
      model: 'Vitodens 100',
      serialNumber: 'SN-42',
      installedOn: '2024-03-01',
      warrantyEndsOn: '2026-03-01',
    };

    it('accepts a complete asset and trims the label', () => {
      const parsed = createFieldServiceAssetSchema.parse(valid);
      expect(parsed.label).toBe('Chaudière gaz');
      expect(parsed.siteId).toBeUndefined();
    });

    it('normalizes blank optional text to null', () => {
      const parsed = createFieldServiceAssetSchema.parse({ ...valid, manufacturer: '   ', notes: '' });
      expect(parsed.manufacturer).toBeNull();
      expect(parsed.notes).toBeNull();
    });

    it('rejects a warranty ending before installation', () => {
      const result = createFieldServiceAssetSchema.safeParse({ ...valid, warrantyEndsOn: '2024-02-28' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['warrantyEndsOn']);
    });

    it('rejects unknown categories, malformed dates, empty labels and extra fields', () => {
      expect(createFieldServiceAssetSchema.safeParse({ ...valid, category: 'rocket' }).success).toBe(false);
      expect(createFieldServiceAssetSchema.safeParse({ ...valid, installedOn: '01/03/2024' }).success).toBe(false);
      expect(createFieldServiceAssetSchema.safeParse({ ...valid, installedOn: '2024-13-45' }).success).toBe(false);
      expect(createFieldServiceAssetSchema.safeParse({ ...valid, label: '  ' }).success).toBe(false);
      expect(createFieldServiceAssetSchema.safeParse({ ...valid, organizationId: 'org-x' }).success).toBe(false);
    });

    it('never lets the client or organization change through an update', () => {
      expect(updateFieldServiceAssetSchema.safeParse({ id: 'a1', clientId: 'cli-2' }).success).toBe(false);
      expect(updateFieldServiceAssetSchema.safeParse({ id: 'a1', organizationId: 'org-2' }).success).toBe(false);
      expect(updateFieldServiceAssetSchema.parse({ id: 'a1', status: 'out_of_service' }).status).toBe('out_of_service');
    });

    it('validates list filters and link payloads strictly', () => {
      expect(listFieldServiceAssetsSchema.safeParse({ status: 'broken' }).success).toBe(false);
      expect(workOrderAssetLinkSchema.safeParse({ workOrderId: 'wo', assetId: '' }).success).toBe(false);
      expect(workOrderAssetLinkSchema.safeParse({ workOrderId: 'wo', assetId: 'a', clientId: 'c' }).success).toBe(false);
    });
  });

  describe('server actions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      requireFieldServiceContext.mockResolvedValue({ userId: 'u1', organizationId: 'org-session' });
    });

    it('scopes creation to the session organization, never to client input', async () => {
      service.createFieldServiceAsset.mockResolvedValue({ id: 'asset-1' });
      const result = await createFieldServiceAssetAction({ clientId: 'cli-1', category: 'cooling', label: 'Clim salon' });
      expect(result).toEqual({ ok: true, data: { id: 'asset-1' } });
      expect(service.createFieldServiceAsset).toHaveBeenCalledWith('org-session', expect.objectContaining({ clientId: 'cli-1' }));
    });

    it('returns expected business errors instead of throwing', async () => {
      service.linkAssetToWorkOrder.mockRejectedValue(new AppError('Clients différents', 422, 'ASSET_CLIENT_MISMATCH'));
      const result = await linkAssetToWorkOrderAction({ workOrderId: 'wo-1', assetId: 'asset-1' });
      expect(result).toEqual({ ok: false, error: 'Clients différents', code: 'ASSET_CLIENT_MISMATCH' });
    });

    it('returns validation errors without calling the service', async () => {
      const result = await updateFieldServiceAssetAction({ id: 'a1', warrantyEndsOn: 'demain' });
      expect(result.ok).toBe(false);
      expect(service.updateFieldServiceAsset).not.toHaveBeenCalled();
    });

    it('denies non Field Service workspaces through the context guard', async () => {
      requireFieldServiceContext.mockRejectedValue(new AppError('Interdit', 403, 'FIELD_SERVICE_ACCESS_FORBIDDEN'));
      const result = await unlinkAssetFromWorkOrderAction({ workOrderId: 'wo-1', assetId: 'asset-1' });
      expect(result).toEqual({ ok: false, error: 'Interdit', code: 'FIELD_SERVICE_ACCESS_FORBIDDEN' });
      expect(service.unlinkAssetFromWorkOrder).not.toHaveBeenCalled();
    });

    it('rethrows unexpected failures so they are not disguised as user errors', async () => {
      service.createFieldServiceAsset.mockRejectedValue(new Error('connection reset'));
      await expect(createFieldServiceAssetAction({ clientId: 'c', category: 'other', label: 'X' })).rejects.toThrow('connection reset');
    });
  });
});
