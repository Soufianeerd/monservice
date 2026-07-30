'use server';

import { userService } from '@/lib/services/user.service';
import { organizationRepository } from '@/lib/data';
import { ProfileType } from '@/lib/data/interfaces';
import { cookies } from 'next/headers';
import { generateId } from '@/lib/utils/id-generator';
import bcrypt from 'bcryptjs';

export async function registerAction(data: {
  name: string;
  email: string;
  password?: string;
  orgName?: string;
  profileType?: ProfileType;
  sector?: string;
}) {
  try {
    const existing = await userService.getUserByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Cet email est déjà utilisé.' };
    }

    let orgId = undefined;
    if (data.orgName && data.profileType === 'professional') {
      const newOrg = await organizationRepository.create({
        name: data.orgName,
        industry: data.sector || 'Non spécifié',
        sector: data.sector,
        profileType: 'professional',
        isPublic: true,
        country: 'France',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      orgId = newOrg.id;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = data.password ? await bcrypt.hash(data.password, salt) : undefined;

    const newUser = await userService.createUser({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'admin',
      profileType: data.profileType || 'client',
      sector: data.sector,
      onboardingCompleted: false,
      onboardingStep: 0,
      organizationId: orgId,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', newUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('Register error:', err);
    return { success: false, error: 'Erreur serveur.' };
  }
}
