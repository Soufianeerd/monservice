export type ProfileType = 'client' | 'professional';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'member';
  profileType: ProfileType;
  sector?: string;
  organizationId?: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  
  // Billing
  subscriptionTier?: 'free' | 'starter' | 'pro' | 'business';
  subscriptionStatus?: 'active' | 'inactive' | 'past_due' | 'canceled';
  stripeCustomerId?: string;

  createdAt: string;
  updatedAt: string;
}
