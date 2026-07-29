import { createClient } from '@/utils/supabase/client';
import { User } from '../data/interfaces';

export const userService = {
  async getUserProfile(userId: string): Promise<User | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.warn('Error fetching user profile from Supabase:', error.message);
        return null;
      }
      return data as User;
    } catch (err) {
      console.error('Unexpected error fetching user profile:', err);
      return null;
    }
  },

  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User | null> {
    const supabase = createClient();
    try {
      const dataToUpdate = { ...updateData };
      if ('password' in dataToUpdate) {
        delete dataToUpdate.password;
      }

      const { data, error } = await supabase
        .from('users')
        .update(dataToUpdate)
        .eq('id', userId)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating user profile in Supabase:', error.message);
        return null;
      }
      return data as User;
    } catch (err) {
      console.error('Unexpected error updating user profile:', err);
      return null;
    }
  },

  async getAllUsers(): Promise<User[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
        
      if (error) {
        console.warn('Error fetching all users from Supabase:', error.message);
        return [];
      }
      return data as User[];
    } catch (err) {
      console.error('Unexpected error fetching all users:', err);
      return [];
    }
  }
};
