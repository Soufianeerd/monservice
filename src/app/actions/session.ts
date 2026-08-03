'use server';

import { userService } from '@/lib/services/user.service';
import { organizationRepository } from '@/lib/data';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { User } from '@/lib/data/interfaces/user.interface';

export async function loginAction(email: string, password?: string) {
  try {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Identifiants incorrects.' };
    }

    // In a real app we would check password:
    // const isValid = await bcrypt.compare(password, user.password);
    // if (!isValid) return { success: false, error: 'Identifiants incorrects.' };

    const cookieStore = await cookies();
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return { success: true, user };
  } catch (err: unknown) {
    console.error('Login error:', err);
    return { success: false, error: 'Erreur serveur.' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}

export async function getSessionAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;
  if (!sessionId) return { user: null };

  const user = await userService.getUserProfile(sessionId);
  return { user };
}

export async function getOrganizationAction(id: string) {
  return await organizationRepository.getById(id);
}

export async function updateUserAction(id: string, data: Partial<User>) {
  return await userService.updateUserProfile(id, data);
}
