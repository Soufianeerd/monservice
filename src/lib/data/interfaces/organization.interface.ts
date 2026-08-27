import type { ParamedicalProfessionCode } from '@/lib/workspaces/paramedical/professions';

export interface Organization {
  id: string;
  name: string;
  industry: string;
  secondarySkills?: string;
  sector?: string;
  profession?: ParamedicalProfessionCode | null;
  profileType?: 'professional';
  isPublic: boolean;
  customIndustry?: string;
  country: string;
  address?: string;
  city?: string;
  zipCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  currency?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  slug?: string;
  description?: string;
  services?: string[];
  coverImage?: string;
  interventionRadius?: number;
  postalCode?: string;
  isPublished?: boolean;
  socialLinks?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // Connect
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'disabled';
  
  // Billing Config
  legalNotice?: string;
  paymentTerms?: string;
  bankDetails?: string;
}
