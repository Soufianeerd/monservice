export interface LegalEntity {
  id: string;
  organizationId: string;
  name: string;
  legalForm?: string | null;
  country: string;
  establishmentCountry?: string | null;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  vatScheme?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  representative?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
