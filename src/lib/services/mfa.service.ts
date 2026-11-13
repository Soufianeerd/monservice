import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export class MFAService {
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    throw new Error('MFA is unavailable until a supported Neon Auth flow is integrated and verified.');
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    throw new Error('MFA is unavailable until a supported Neon Auth flow is integrated and verified.');
  }

  async enableMFA(userId: string): Promise<void> {
    throw new Error('MFA is unavailable until a supported Neon Auth flow is integrated and verified.');
  }

  async disableMFA(userId: string): Promise<void> {
    throw new Error('MFA is unavailable until a supported Neon Auth flow is integrated and verified.');
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl);
  }
}

export const mfaService = new MFAService();
