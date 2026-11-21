// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ rows: vi.fn(), verified: vi.fn() }));
vi.mock('react', () => ({ cache: (fn: unknown) => fn }));
vi.mock('@/lib/db/server', () => ({ db: { select: () => ({ from: () => ({ where: mocks.rows }) }) } }));
vi.mock('@/lib/auth/two-factor/session-cookie', () => ({ hasVerifiedSecondFactor: mocks.verified }));
import { getPendingSecondFactorContext, getSessionContext, requireSession } from '@/lib/auth/session';

const profile = { id: 'pro', email: 'pro@example.test', profileType: 'professional', organizationId: 'org', accountClosedAt: null };

describe('Second factor gates every session helper', () => {
  beforeEach(() => { mocks.rows.mockReset(); mocks.verified.mockReset(); });

  it('lets accounts without two-factor in, without reading the proof cookie', async () => {
    mocks.rows.mockResolvedValue([{ ...profile, twoFactorEnabled: false }]);
    expect((await getSessionContext())?.userId).toBe('pro');
    expect(mocks.verified).not.toHaveBeenCalled();
  });

  it('treats a password-only session as signed out until the code is verified', async () => {
    mocks.rows.mockResolvedValue([{ ...profile, twoFactorEnabled: true }]);
    mocks.verified.mockResolvedValue(false);
    expect(await getSessionContext()).toBeNull();
    await expect(requireSession()).rejects.toMatchObject({ statusCode: 401 });
    expect((await getPendingSecondFactorContext())?.userId).toBe('pro');
  });

  it('opens the session once the proof matches this user and session', async () => {
    mocks.rows.mockResolvedValue([{ ...profile, twoFactorEnabled: true }]);
    mocks.verified.mockResolvedValue(true);
    expect((await getSessionContext())?.userId).toBe('pro');
    expect(await getPendingSecondFactorContext()).toBeNull();
    expect(mocks.verified).toHaveBeenCalledWith('pro');
  });

  it('never reports a pending second factor for a closed account', async () => {
    mocks.rows.mockResolvedValue([{ ...profile, twoFactorEnabled: true, accountClosedAt: new Date() }]);
    expect(await getPendingSecondFactorContext()).toBeNull();
  });
});
