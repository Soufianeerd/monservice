import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export class MFAService {
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    throw new Error('MFA is now managed by Supabase Auth. Use Supabase client API instead.');
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    throw new Error('MFA is now managed by Supabase Auth. Use Supabase client API instead.');
  }

  async enableMFA(userId: string): Promise<void> {
    throw new Error('MFA is now managed by Supabase Auth. Use Supabase client API instead.');
  }

  async disableMFA(userId: string): Promise<void> {
    throw new Error('MFA is now managed by Supabase Auth. Use Supabase client API instead.');
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl);
  }
}

export const mfaService = new MFAService();
