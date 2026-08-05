import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '@/lib/services/user.service';
import * as passwordUtils from '@/lib/utils/password';

// Mock the database
vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn()
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn()
      }))
    }))
  }
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hash password on createUser', async () => {
    const spy = vi.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashed_password');
    
    // We mock insert since we just want to verify the hash was called.
    // The actual insert mock doesn't need to do anything.
    
    await userService.createUser({
      name: 'Test User',
      email: 'test@test.com',
      password: '123456',
      role: 'admin',
      profileType: 'client',
      onboardingCompleted: false,
      onboardingStep: 0
    });
    
    expect(spy).toHaveBeenCalledWith('123456');
  });

  it('should generate an id for the new user', async () => {
    const user = await userService.createUser({
      name: 'No Password User',
      email: 'nopass@test.com',
      role: 'member',
      profileType: 'client',
      onboardingCompleted: false,
      onboardingStep: 0
    });
    
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('string');
  });
});
