'use server';
import { organizationService } from '@/lib/services/organization.service';
import { userService } from '@/lib/services/user.service';
import { User } from '@/lib/data/interfaces/user.interface';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getSessionAction() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) return { user: null };

  const user = await userService.getUserProfile(userId);
  return { user };
}

export async function getOrganizationAction(id: string) {
  return await organizationService.getById(id);
}

export async function updateUserAction(id: string, data: Partial<User>) {
  return await userService.updateUserProfile(id, data);
}
