import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/utils/password';

describe('Password Utilities', () => {
  it('should hash a password successfully', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify a correct password', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });
});
