import { type InferSelectModel } from 'drizzle-orm';
import { 
  practiceLocations, 
  practicePractitioners, 
  practitionerLocations, 
  practiceRooms, 
  practiceResources 
} from '../db/schema';

export type PracticeLocation = InferSelectModel<typeof practiceLocations>;
export type PracticePractitioner = InferSelectModel<typeof practicePractitioners>;
export type PractitionerLocationAssignment = InferSelectModel<typeof practitionerLocations>;
export type PracticeRoom = InferSelectModel<typeof practiceRooms>;
export type PracticeResource = InferSelectModel<typeof practiceResources>;

export type PracticeLocationDTO = Omit<PracticeLocation, 'organizationId' | 'createdAt' | 'updatedAt'>;
export type PracticePractitionerDTO = Omit<PracticePractitioner, 'organizationId' | 'createdAt' | 'updatedAt'>;
export type PracticeRoomDTO = Omit<PracticeRoom, 'organizationId' | 'createdAt' | 'updatedAt'>;
export type PracticeResourceDTO = Omit<PracticeResource, 'organizationId' | 'createdAt' | 'updatedAt'>;

export interface PractitionerLocationAssignmentDTO {
  id: string;
  practitionerId: string;
  locationId: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface LinkedProfessionalUser {
  id: string;
  name: string | null;
  email: string;
}

export interface PracticeStructureOverview {
  locations: PracticeLocationDTO[];
  practitioners: PracticePractitionerDTO[];
  assignments: PractitionerLocationAssignmentDTO[];
  rooms: PracticeRoomDTO[];
  resources: PracticeResourceDTO[];
  eligibleUsers: LinkedProfessionalUser[];
}

