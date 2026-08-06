import { describe, it, expect, vi } from 'vitest';
import { userService } from '@/lib/services/user.service';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

vi.mock('@/lib/db/server', () => ({ db: { select: vi.fn() } }));

describe('User Service', () => {
  it('should fetch a user profile by ID', async () => {
    const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser])
      })
    });
    const result = await userService.getUserProfile('1');
    expect(result).toEqual(mockUser);
  });
});
