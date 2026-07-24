export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  industry?: string;
  customIndustry?: string;
  country?: string;
  city?: string;
  zipCode?: string;
  website?: string;
  
  // Contact principal
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPosition?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
