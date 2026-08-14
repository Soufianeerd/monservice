import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MFAService } from '@/lib/services/mfa.service';

vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([
          { id: 'user1', email: 'test@example.com', mfaSecret: 'JBSWY3DPEHPK3PXP' }
        ])
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(true)
      }))
    }))
  }
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockedqr')
  }
}));

describe('MFAService', () => {
  let mfaService: MFAService;

  beforeEach(() => {
    vi.clearAllMocks();
    mfaService = new MFAService();
  });

  it('should throw an error for generating secret since MFA is managed by Supabase', async () => {
    await expect(mfaService.generateSecret('user1')).rejects.toThrow('MFA is now managed by Supabase Auth');
  });

  it('should throw an error for verifyCode since MFA is managed by Supabase', async () => {
    await expect(mfaService.verifyCode('user1', '000000')).rejects.toThrow('MFA is now managed by Supabase Auth');
  });
});
