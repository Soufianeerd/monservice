export type ProfileType = 'client' | 'professional';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  /**
   * @deprecated Cette propriété n'existe pas dans le schéma de base : elle
   * était écrite en dur à l'inscription (`role: 'admin'`) et silencieusement
   * ignorée (anomalie MS-034). Le contrôle d'accès repose sur `profileType`.
   * Un vrai modèle de rôles reste à définir (voir REMEDIATION_BACKLOG §4.4).
   */
  role?: 'admin' | 'member';
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
