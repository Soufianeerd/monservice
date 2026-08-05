import { db } from '../db/server';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { User } from '../data/interfaces';
import { generateId } from '../utils/id-generator';

export const userService = {
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, userId));
      if (!result[0]) return null;
      return result[0] as unknown as User;
    } catch (err) {
      console.error('Unexpected error fetching user profile:', err);
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email));
      if (!result[0]) return null;
      return result[0] as unknown as User;
    } catch (err) {
      console.error('Unexpected error fetching user by email:', err);
      return null;
    }
  },

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = generateId();
    const now = new Date().toISOString();
    
    let hashedPassword = undefined;
    if (data.password) {
      const { hashPassword } = await import('../utils/password');
      hashedPassword = await hashPassword(data.password);
    }
    
    const newUser = {
      ...data,
      id,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(users).values(newUser as unknown as typeof users.$inferInsert);
    return newUser as User;
  },

  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User | null> {
    try {
      const dataToUpdate = { ...updateData, updatedAt: new Date().toISOString() };
      
      await db.update(users)
        .set(dataToUpdate)
        .where(eq(users.id, userId));
        
      return await this.getUserProfile(userId);
    } catch (err) {
      console.error('Unexpected error updating user profile:', err);
      return null;
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const results = await db.select().from(users);
      return results as unknown[] as User[];
    } catch (err) {
      console.error('Unexpected error fetching all users:', err);
      return [];
    }
  }
};
