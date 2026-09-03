export const PATIENT_SEX_CODES = [
  'female',
  'male',
  'indeterminate',
  'unknown'
] as const;

export type PatientSexCode = (typeof PATIENT_SEX_CODES)[number];

export const PATIENT_RELATIONSHIP_CODES = [
  'parent',
  'legal_guardian',
  'spouse_partner',
  'adult_child',
  'sibling',
  'caregiver',
  'other'
] as const;

export type PatientRelationshipCode = (typeof PATIENT_RELATIONSHIP_CODES)[number];

export interface PatientProfileDTO {
  id: string;
  birthName: string;
  firstBirthName: string;
  birthFirstNames: string | null;
  usedName: string | null;
  usedFirstName: string | null;
  birthDate: string;
  sex: PatientSexCode;
  birthPlace: string | null;
  birthPlaceCode: string | null;
  birthCountry: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  isActive: boolean;
}

export interface PatientRepresentativeDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  isActive: boolean;
}

export interface PatientRepresentativeLinkDTO {
  id: string;
  patientId: string;
  representativeId: string;
  relationship: PatientRelationshipCode;
  isLegalRepresentative: boolean;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  isBillingContact: boolean;
  isActive: boolean;
}

export interface PatientRepresentativeWithLinkDTO {
  linkId: string;
  representativeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  relationship: PatientRelationshipCode;
  isLegalRepresentative: boolean;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  isBillingContact: boolean;
  isLinkActive: boolean;
  isRepresentativeActive: boolean;
}

export interface PatientDetailDTO {
  patient: PatientProfileDTO;
  representatives: PatientRepresentativeWithLinkDTO[];
}

export interface PatientListFilters {
  birthName?: string | null;
  firstName?: string | null;
  birthDate?: string | null;
  active?: 'active' | 'archived' | 'all';
  limit?: number;
  offset?: number;
}

export interface PatientListResult {
  rows: PatientProfileDTO[];
  total: number;
  limit: number;
  offset: number;
}
