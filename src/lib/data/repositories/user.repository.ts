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

  async updateOnboardingStatus(userId: string, step: number, completed: boolean): Promise<User | null> {
    await this.simulateLatency();
    const index = this.items.findIndex(item => item.id === userId);
    if (index === -1) return null;
    
    this.items[index] = {
      ...this.items[index],
      onboardingStep: step,
      onboardingCompleted: completed,
      updatedAt: new Date().toISOString()
    };
    return { ...this.items[index] };
  }

  async updateSubscription(userId: string, tier: 'free' | 'starter' | 'pro' | 'business', status: 'active' | 'inactive' | 'past_due' | 'canceled', customerId: string): Promise<User | null> {
    await this.simulateLatency();
    const index = this.items.findIndex(item => item.id === userId);
    if (index === -1) return null;
    
    this.items[index] = {
      ...this.items[index],
      subscriptionTier: tier,
      subscriptionStatus: status,
      stripeCustomerId: customerId,
      updatedAt: new Date().toISOString()
    };
    return { ...this.items[index] };
  }
}

// Singleton instance for the demo
export const userRepository = new UserRepository();
