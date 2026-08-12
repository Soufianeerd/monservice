import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

export class MFAService {
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (!userResult.length) throw new AppError('User not found', 404);
    
    const email = userResult[0].email;
    
    const secret = speakeasy.generateSecret({
      name: `MonService:${email}`,
      length: 20,
    });
    
    const otpauthUrl = secret.otpauth_url || '';
    
    // Temporarily store the secret in the database until they verify it
    await db.update(users)
      .set({ mfaSecret: secret.base32 })
      .where(eq(users.id, userId));
      
    return { secret: secret.base32, otpauthUrl };
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (!userResult.length) throw new AppError('User not found', 404);
    
    const user = userResult[0];
    if (!user.mfaSecret) return false;
    
    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1, // Allow 30 seconds of drift before/after
    });
  }

  async enableMFA(userId: string): Promise<void> {
    await db.update(users)
      .set({ mfaEnabled: true })
      .where(eq(users.id, userId));
  }

  async disableMFA(userId: string): Promise<void> {
    await db.update(users)
      .set({ mfaEnabled: false, mfaSecret: null })
      .where(eq(users.id, userId));
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl);
  }
}

export const mfaService = new MFAService();
