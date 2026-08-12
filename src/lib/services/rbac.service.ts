import { db } from '@/lib/db/server';
import { userRoles, rolePermissions, permissions } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { AppError } from '@/lib/errors';

export class RBACService {
  async getUserRoles(userId: string, organizationId: string): Promise<string[]> {
    const rolesResult = await db.select().from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.organizationId, organizationId)));
    return rolesResult.map(r => r.roleId);
  }

  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    const userRolesList = await this.getUserRoles(userId, organizationId);
    if (userRolesList.length === 0) return [];

    const perms = await db.select({
      name: permissions.name,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, userRolesList));

    return perms.map(p => p.name);
  }

  async can(userId: string, organizationId: string, permission: string): Promise<boolean> {
    const perms = await this.getUserPermissions(userId, organizationId);
    return perms.includes(permission);
  }

  async require(userId: string, organizationId: string, permission: string): Promise<void> {
    if (!await this.can(userId, organizationId, permission)) {
      throw new AppError('Permission denied', 403);
    }
  }

  async assignRole(userId: string, organizationId: string, roleId: string): Promise<void> {
    await db.insert(userRoles).values({
      id: generateId(),
      userId,
      organizationId,
      roleId,
    });
  }

  async removeRole(userId: string, organizationId: string, roleId: string): Promise<void> {
    await db.delete(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.organizationId, organizationId),
        eq(userRoles.roleId, roleId)
      ));
  }
}
