export interface Organization {
  id: string;
  name: string;
  industry: string;
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
}
