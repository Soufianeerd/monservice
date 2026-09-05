export const APPOINTMENT_STATUS_CODES = ['scheduled', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS_CODES)[number];

export const APPOINTMENT_CANCELLATION_REASON_CODES = [
  'patient_request',
  'practitioner_request',
  'practice_unavailable',
  'scheduling_error',
  'duplicate',
  'other',
] as const;
export type AppointmentCancellationReasonCode =
  (typeof APPOINTMENT_CANCELLATION_REASON_CODES)[number];

export const WAITLIST_STATUS_CODES = ['waiting', 'resolved'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUS_CODES)[number];

export const WAITLIST_RESOLUTION_CODES = [
  'booked',
  'withdrawn',
  'not_needed',
  'other',
] as const;
export type WaitlistResolutionCode =
  (typeof WAITLIST_RESOLUTION_CODES)[number];

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
  cancellationReasonCode: AppointmentCancellationReasonCode | null;
  cancelledAt: string | null;
  noShowAt: string | null;
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
  cancellationReasonCode: AppointmentCancellationReasonCode | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  localDate: string; // YYYY-MM-DD in Location's timezone
  localStartTime: string; // HH:mm in Location's timezone
  localEndTime: string; // HH:mm in Location's timezone
}

export interface WaitlistEntryDTO {
  id: string;
  organizationId: string;
  patientId: string;
  patientName?: string;
  appointmentTypeId: string;
  appointmentTypeName?: string;
  locationId: string;
  locationName?: string;
  practitionerId: string | null;
  practitionerName?: string | null;
  preferredDateFrom: string; // YYYY-MM-DD
  preferredDateUntil: string | null; // YYYY-MM-DD or null
  preferredStartTime: string | null; // HH:mm:ss or HH:mm or null
  preferredEndTime: string | null; // HH:mm:ss or HH:mm or null
  timezone: string;
  status: WaitlistStatus;
  resolutionCode: WaitlistResolutionCode | null;
  resolvedAt: string | null;
  resolvedAppointmentId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistFilters {
  status?: WaitlistStatus;
  locationId?: string;
  practitionerId?: string;
  appointmentTypeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface WaitlistMatchDTO {
  waitlistEntry: WaitlistEntryDTO;
  matchScore: number;
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

