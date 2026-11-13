import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acknowledgeWorkReportSchema } from '../../../src/lib/validation/field-service-client-portal.schemas';
import { AppError } from '../../../src/lib/errors';

const acknowledgeWorkReport = vi.hoisted(() => vi.fn());
const requireProfileType = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ requireProfileType }));
vi.mock('@/lib/services/field-service-client-portal.service', () => ({ acknowledgeWorkReport }));

import { acknowledgeWorkReportAction } from '../../../src/app/actions/field-service-client-portal.actions';

describe('Session 20 — client portal acknowledgements', () => {
  describe('validation', () => {
    it('accepts a plain acceptance and normalizes an empty comment', () => {
      const parsed = acknowledgeWorkReportSchema.parse({ workReportId: 'r1', signerName: '  Alice  ', decision: 'accepted', comment: '' });
      expect(parsed.signerName).toBe('Alice');
      expect(parsed.comment).toBeNull();
    });

    it('requires reservations to be described', () => {
      const result = acknowledgeWorkReportSchema.safeParse({ workReportId: 'r1', signerName: 'Alice', decision: 'accepted_with_reservations', comment: ' ' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['comment']);
    });

    it('rejects short names, unknown decisions and injected identity fields', () => {
      expect(acknowledgeWorkReportSchema.safeParse({ workReportId: 'r1', signerName: 'A', decision: 'accepted' }).success).toBe(false);
      expect(acknowledgeWorkReportSchema.safeParse({ workReportId: 'r1', signerName: 'Alice', decision: 'rejected' }).success).toBe(false);
      expect(acknowledgeWorkReportSchema.safeParse({ workReportId: 'r1', signerName: 'Alice', decision: 'accepted', acknowledgedByUserId: 'other' }).success).toBe(false);
    });
  });

  describe('action', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      requireProfileType.mockResolvedValue({ userId: 'client-user', profileType: 'client' });
    });

    it('signs with the session user only', async () => {
      acknowledgeWorkReport.mockResolvedValue({ workOrderId: 'wo-1' });
      const result = await acknowledgeWorkReportAction({ workReportId: 'r1', signerName: 'Alice', decision: 'accepted' });
      expect(result).toEqual({ ok: true, data: { workOrderId: 'wo-1' } });
      expect(requireProfileType).toHaveBeenCalledWith('client');
      expect(acknowledgeWorkReport).toHaveBeenCalledWith('client-user', expect.objectContaining({ workReportId: 'r1' }));
    });

    it('returns business errors such as a second acknowledgement', async () => {
      acknowledgeWorkReport.mockRejectedValue(new AppError('Déjà réceptionné', 409, 'REPORT_ALREADY_ACKNOWLEDGED'));
      const result = await acknowledgeWorkReportAction({ workReportId: 'r1', signerName: 'Alice', decision: 'accepted' });
      expect(result).toEqual({ ok: false, error: 'Déjà réceptionné', code: 'REPORT_ALREADY_ACKNOWLEDGED' });
    });

    it('denies professionals through the profile guard', async () => {
      requireProfileType.mockRejectedValue(new AppError('Accès refusé', 403, 'FORBIDDEN_PROFILE'));
      const result = await acknowledgeWorkReportAction({ workReportId: 'r1', signerName: 'Alice', decision: 'accepted' });
      expect(result.ok).toBe(false);
      expect(acknowledgeWorkReport).not.toHaveBeenCalled();
    });
  });
});
