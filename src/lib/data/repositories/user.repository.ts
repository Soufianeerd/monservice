import { BaseRepository } from './base.repository';
import { User } from '../interfaces';
import { usersFixture } from '../fixtures';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(usersFixture);
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.simulateLatency();
    const user = this.items.find(u => u.email === email);
    return user ? { ...user } : null;
  }
}

// Singleton instance for the demo
export const userRepository = new UserRepository();
