import { AvailabilityRuleDTO, AvailabilityExceptionDTO } from './types';

export interface TimeInterval {
  startMinutes: number; // minutes from 00:00 (e.g. 09:00 = 540)
  endMinutes: number; // minutes from 00:00 (e.g. 17:00 = 1020)
}

/**
 * Converts "HH:mm" or "HH:mm:ss" to minutes from 00:00.
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from 00:00 to "HH:mm".
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Returns the weekday number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * for a local date string "YYYY-MM-DD".
 */
export function getWeekdayFromLocalDate(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Date invalide: ${localDate}`);
  }
  // Construct date in local system or UTC day computation
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.getUTCDay();
}

/**
 * Checks if an appointment crosses midnight local time.
 */
export function isOvernight(localStartTime: string, durationMinutes: number): boolean {
  const startMinutes = timeStringToMinutes(localStartTime);
  const endMinutes = startMinutes + durationMinutes;
  return endMinutes > 1440; // 24 * 60 = 1440
}

/**
 * Converts a local wall-clock date and time in an IANA timezone to a UTC Date.
 */
export function localToUtc(localDate: string, localTime: string, timezone: string): Date {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, min] = localTime.split(':').map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    min === undefined
  ) {
    throw new Error(`Format de date ou heure local invalide: ${localDate} ${localTime}`);
  }

  // Start with UTC estimation
  let estimate = Date.UTC(year, month - 1, day, hour, min, 0, 0);

  // Refine using Intl.DateTimeFormat
  for (let iter = 0; iter < 4; iter++) {
    const d = new Date(estimate);
    const formatted = formatUtcToLocal(d, timezone);
    const [fYear, fMonth, fDay] = formatted.localDate.split('-').map(Number);
    const [fHour, fMin] = formatted.localTime.split(':').map(Number);

    if (
      fYear === undefined ||
      fMonth === undefined ||
      fDay === undefined ||
      fHour === undefined ||
      fMin === undefined
    ) {
      break;
    }

    const formattedUtcMs = Date.UTC(fYear, fMonth - 1, fDay, fHour, fMin, 0, 0);
    const targetUtcMs = Date.UTC(year, month - 1, day, hour, min, 0, 0);
    const diff = targetUtcMs - formattedUtcMs;

    if (diff === 0) {
      return d;
    }
    estimate += diff;
  }

  return new Date(estimate);
}

/**
 * Formats a UTC Date to local date (YYYY-MM-DD) and local time (HH:mm) in the specified timezone.
 */
export function formatUtcToLocal(
  utcDate: Date,
  timezone: string
): { localDate: string; localTime: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(utcDate);
  let year = '';
  let month = '';
  let day = '';
  let hour = '';
  let minute = '';

  for (const p of parts) {
    if (p.type === 'year') year = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
  }

  return {
    localDate: `${year}-${month}-${day}`,
    localTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  };
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the specified IANA timezone.
 */
export function getCurrentLocalDateInTimezone(
  now: Date = new Date(),
  timezone: string = 'Europe/Paris'
): string {
  return formatUtcToLocal(now, timezone).localDate;
}

/**
 * Verifies that converting local date/time to UTC and back yields the exact same local date/time.
 * Protects against non-existent local times during Daylight Saving Time (DST) spring forward transitions.
 */
export function verifyTimezoneRoundTrip(
  localDate: string,
  localTime: string,
  timezone: string
): { isValid: boolean; utcDate: Date } {
  const normalizedTime = localTime.slice(0, 5);
  const utcDate = localToUtc(localDate, normalizedTime, timezone);
  const roundTrip = formatUtcToLocal(utcDate, timezone);

  const isValid =
    roundTrip.localDate === localDate && roundTrip.localTime === normalizedTime;

  return { isValid, utcDate };
}

/**
 * Merges overlapping or contiguous time intervals.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length <= 1) return [...intervals];

  const sorted = [...intervals].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: TimeInterval[] = [];
  let current = sorted[0];
  if (!current) return [];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (!next) continue;
    if (next.startMinutes <= current.endMinutes) {
      current = {
        startMinutes: current.startMinutes,
        endMinutes: Math.max(current.endMinutes, next.endMinutes),
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Subtracts a list of closed intervals from a list of open intervals.
 * Closed ALWAYS wins.
 */
export function subtractIntervals(
  baseIntervals: TimeInterval[],
  closedIntervals: TimeInterval[]
): TimeInterval[] {
  if (baseIntervals.length === 0) return [];
  if (closedIntervals.length === 0) return mergeIntervals(baseIntervals);

  let currentList = mergeIntervals(baseIntervals);

  for (const closed of closedIntervals) {
    const nextList: TimeInterval[] = [];
    for (const open of currentList) {
      // 1. No overlap: closed is before or after open
      if (closed.endMinutes <= open.startMinutes || closed.startMinutes >= open.endMinutes) {
        nextList.push(open);
        continue;
      }
      // 2. Closed completely covers open -> open is completely removed
      if (closed.startMinutes <= open.startMinutes && closed.endMinutes >= open.endMinutes) {
        continue;
      }
      // 3. Closed overlaps start of open -> keep right remainder
      if (closed.startMinutes <= open.startMinutes && closed.endMinutes < open.endMinutes) {
        nextList.push({
          startMinutes: closed.endMinutes,
          endMinutes: open.endMinutes,
        });
        continue;
      }
      // 4. Closed overlaps end of open -> keep left remainder
      if (closed.startMinutes > open.startMinutes && closed.endMinutes >= open.endMinutes) {
        nextList.push({
          startMinutes: open.startMinutes,
          endMinutes: closed.startMinutes,
        });
        continue;
      }
      // 5. Closed is strictly inside open -> split into two parts
      if (closed.startMinutes > open.startMinutes && closed.endMinutes < open.endMinutes) {
        nextList.push({
          startMinutes: open.startMinutes,
          endMinutes: closed.startMinutes,
        });
        nextList.push({
          startMinutes: closed.endMinutes,
          endMinutes: open.endMinutes,
        });
        continue;
      }
    }
    currentList = nextList;
  }

  return currentList;
}

/**
 * Computes the effective available time intervals for a practitioner at a location on a specific date.
 * Rule:
 * 1. Base availability comes from active weekly availability rules valid on this date.
 * 2. Active 'open' exceptions on this date add available intervals.
 *    - Full-day 'open' (startTime=null, endTime=null) opens the whole day: 00:00 -> 24:00 (0 to 1440 min).
 * 3. Active 'closed' exceptions on this date subtract intervals (CLOSED ALWAYS WINS).
 */
export function computeEffectiveAvailability(params: {
  localDate: string;
  rules: AvailabilityRuleDTO[];
  exceptions: AvailabilityExceptionDTO[];
}): TimeInterval[] {
  const { localDate, rules, exceptions } = params;
  const weekday = getWeekdayFromLocalDate(localDate);

  // 1. Filter active weekly rules matching weekday & validity period
  const matchingRules = rules.filter((r) => {
    if (!r.isActive) return false;
    if (r.weekday !== weekday) return false;
    if (r.validFrom > localDate) return false;
    if (r.validUntil && r.validUntil < localDate) return false;
    return true;
  });

  const baseIntervals: TimeInterval[] = matchingRules.map((r) => ({
    startMinutes: timeStringToMinutes(r.startTime),
    endMinutes: timeStringToMinutes(r.endTime),
  }));

  // 2. Filter active exceptions for this date
  const dateExceptions = exceptions.filter(
    (e) => e.isActive && e.localDate === localDate
  );

  // Open exceptions
  const openExceptions = dateExceptions.filter((e) => e.kind === 'open');
  const addedIntervals: TimeInterval[] = openExceptions
    .map((e) => {
      // Full-day open exception (00:00 to 24:00)
      if (e.startTime === null && e.endTime === null) {
        return { startMinutes: 0, endMinutes: 1440 };
      }
      if (e.startTime !== null && e.endTime !== null) {
        return {
          startMinutes: timeStringToMinutes(e.startTime),
          endMinutes: timeStringToMinutes(e.endTime),
        };
      }
      return null;
    })
    .filter((int): int is TimeInterval => int !== null);

  const allOpenIntervals = [...baseIntervals, ...addedIntervals];

  // Closed exceptions
  const closedExceptions = dateExceptions.filter((e) => e.kind === 'closed');
  const hasFullDayClosed = closedExceptions.some(
    (e) => e.startTime === null && e.endTime === null
  );

  if (hasFullDayClosed) {
    return [];
  }

  const closedIntervals: TimeInterval[] = closedExceptions
    .filter((e) => e.startTime !== null && e.endTime !== null)
    .map((e) => ({
      startMinutes: timeStringToMinutes(e.startTime as string),
      endMinutes: timeStringToMinutes(e.endTime as string),
    }));

  return subtractIntervals(allOpenIntervals, closedIntervals);
}

/**
 * Checks if a requested slot [startTime, startTime + durationMinutes]
 * is fully contained inside at least one available interval.
 */
export function isSlotAvailable(params: {
  localStartTime: string;
  durationMinutes: number;
  availableIntervals: TimeInterval[];
}): boolean {
  const slotStart = timeStringToMinutes(params.localStartTime);
  const slotEnd = slotStart + params.durationMinutes;

  for (const interval of params.availableIntervals) {
    if (slotStart >= interval.startMinutes && slotEnd <= interval.endMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Detects if two weekly availability rules overlap in their applicability and time window.
 */
export function doAvailabilityRulesOverlap(
  ruleA: {
    practitionerId: string;
    locationId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    validFrom: string;
    validUntil?: string | null;
  },
  ruleB: {
    practitionerId: string;
    locationId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    validFrom: string;
    validUntil?: string | null;
  }
): boolean {
  if (ruleA.practitionerId !== ruleB.practitionerId) return false;
  if (ruleA.locationId !== ruleB.locationId) return false;
  if (ruleA.weekday !== ruleB.weekday) return false;

  // Check date ranges overlap: [validFrom, validUntil || '9999-12-31']
  const startA = ruleA.validFrom;
  const endA = ruleA.validUntil || '9999-12-31';
  const startB = ruleB.validFrom;
  const endB = ruleB.validUntil || '9999-12-31';

  const datesOverlap = startA <= endB && startB <= endA;
  if (!datesOverlap) return false;

  // Check time ranges overlap [startTime, endTime)
  const timeStartA = timeStringToMinutes(ruleA.startTime);
  const timeEndA = timeStringToMinutes(ruleA.endTime);
  const timeStartB = timeStringToMinutes(ruleB.startTime);
  const timeEndB = timeStringToMinutes(ruleB.endTime);

  const timesOverlap = timeStartA < timeEndB && timeStartB < timeEndA;
  return timesOverlap;
}
