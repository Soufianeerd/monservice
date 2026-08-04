'use server';

import { userService } from '@/lib/services/user.service';
import { cookies } from 'next/headers';

export async function getUserProfileAction(userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await userService.getUserProfile(userId);
}

export async function getUserByEmailAction(email?: any) {
  return await userService.getUserByEmail(email);
}

export async function createUserAction(data?: any) {
  return await userService.createUser(data);
}

export async function updateUserProfileAction(userId?: any, updateData?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await userService.updateUserProfile(userId, updateData);
}

export async function getAllUsersAction() {
  return await userService.getAllUsers();
}

