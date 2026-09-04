export const APPOINTMENT_STATUS_CODES = ['scheduled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS_CODES)[number];

export const AVAILABILITY_EXCEPTION_KINDS = ['open', 'closed'] as const;
export type AvailabilityExceptionKind = (typeof AVAILABILITY_EXCEPTION_KINDS)[number];

export interface AppointmentTypeDTO {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  slotStepMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRuleDTO {
  id: string;
  organizationId: string;
  practitionerId: string;
  locationId: string;
  weekday: number; // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  startTime: string; // HH:mm:ss or HH:mm
  endTime: string; // HH:mm:ss or HH:mm
  validFrom: string; // YYYY-MM-DD
  validUntil: string | null; // YYYY-MM-DD or null
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityExceptionDTO {
  id: string;
  organizationId: string;
  practitionerId: string;
  locationId: string;
  localDate: string; // YYYY-MM-DD
  kind: AvailabilityExceptionKind;
  startTime: string | null; // HH:mm:ss or HH:mm or null for full-day
  endTime: string | null; // HH:mm:ss or HH:mm or null for full-day
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentDTO {
  id: string;
  organizationId: string;
  patientId: string;
  practitionerId: string;
  appointmentTypeId: string;
  locationId: string;
  roomId: string | null;
  createdByUserId: string;
  startsAt: string; // ISO UTC timestamptz string
  endsAt: string; // ISO UTC timestamptz string
  occupancyStartsAt: string; // ISO UTC timestamptz string
  occupancyEndsAt: string; // ISO UTC timestamptz string
  timezone: string; // IANA snapshot
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  // Denormalized/joined display fields (optional for DTO consumers)
  patientName?: string;
  practitionerName?: string;
  appointmentTypeName?: string;
  locationName?: string;
  roomName?: string | null;
}

export interface AppointmentCalendarEventDTO {
  id: string;
  patientId: string;
  patientName: string;
  practitionerId: string;
  practitionerName: string;
  appointmentTypeId: string;
  appointmentTypeName: string;
  locationId: string;
  locationName: string;
  roomId: string | null;
  roomName: string | null;
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  occupancyStartsAt: string; // ISO UTC
  occupancyEndsAt: string; // ISO UTC
  timezone: string;
  status: AppointmentStatus;
  localDate: string; // YYYY-MM-DD in Location's timezone
  localStartTime: string; // HH:mm in Location's timezone
  localEndTime: string; // HH:mm in Location's timezone
}

export interface SchedulingLocationDTO {
  id: string;
  name: string;
  timezone: string;
  isActive: boolean;
}

export interface SchedulingPractitionerDTO {
  id: string;
  displayName: string;
  isActive: boolean;
  assignedLocationIds: string[];
}

export interface SchedulingRoomDTO {
  id: string;
  locationId: string;
  name: string;
  isActive: boolean;
}

export interface SchedulingPatientOptionDTO {
  id: string;
  displayName: string;
  birthDate: string;
}

export interface SchedulingBootstrapDTO {
  locations: SchedulingLocationDTO[];
  practitioners: SchedulingPractitionerDTO[];
  rooms: SchedulingRoomDTO[];
  appointmentTypes: AppointmentTypeDTO[];
}
