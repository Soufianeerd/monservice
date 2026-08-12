import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RBACService } from '@/lib/services/rbac.service';
import { AppError } from '@/lib/errors';

vi.mock('@/lib/db/server', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockReturnValue([
          { roleId: 'role_admin' }
        ]),
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { name: 'clients:read' },
            { name: 'invoices:write' }
          ])
        }))
      }))
    })),
  }
}));

describe('RBACService', () => {
  let rbacService: RBACService;

  beforeEach(() => {
    vi.clearAllMocks();
    rbacService = new RBACService();
  });

  it('should return user permissions', async () => {
    const perms = await rbacService.getUserPermissions('user123', 'org123');
    expect(perms).toContain('clients:read');
    expect(perms).toContain('invoices:write');
  });

  it('should return true for can() if user has permission', async () => {
    const result = await rbacService.can('user123', 'org123', 'clients:read');
    expect(result).toBe(true);
  });

  it('should throw AppError if require() fails', async () => {
    await expect(rbacService.require('user123', 'org123', 'invalid:perm')).rejects.toThrow(AppError);
  });
});
