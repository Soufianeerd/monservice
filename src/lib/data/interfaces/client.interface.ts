export interface Client {
  id: string;
  name: string;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  industry?: string | null;
  customIndustry?: string | null;
  country?: string | null;
  city?: string | null;
  zipCode?: string | null;
  website?: string | null;
  company?: string | null;
  notes?: string | null;
  
  // Contact principal
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactPosition?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
