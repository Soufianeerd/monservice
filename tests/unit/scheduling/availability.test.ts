import { describe, it, expect } from 'vitest';
import {
  computeEffectiveAvailability,
  isSlotAvailable,
  isOvernight,
  getWeekdayFromLocalDate,
  formatUtcToLocal,
  verifyTimezoneRoundTrip,
  doAvailabilityRulesOverlap,
  mergeIntervals,
  subtractIntervals,
} from '@/lib/scheduling/availability';
import { AvailabilityRuleDTO, AvailabilityExceptionDTO } from '@/lib/scheduling/types';

describe('Availability Engine & Timezone Helpers', () => {
  describe('Weekday & Time calculations', () => {
    it('computes weekday correctly (0 = Sun, 1 = Mon, ..., 6 = Sat)', () => {
      // 2026-09-04 is Friday (5)
      expect(getWeekdayFromLocalDate('2026-09-04')).toBe(5);
      // 2026-09-06 is Sunday (0)
      expect(getWeekdayFromLocalDate('2026-09-06')).toBe(0);
      // 2026-09-07 is Monday (1)
      expect(getWeekdayFromLocalDate('2026-09-07')).toBe(1);
    });

    it('detects overnight appointments crossing midnight local', () => {
      expect(isOvernight('23:00', 30)).toBe(false); // 23:30 (<= 1440)
      expect(isOvernight('23:00', 60)).toBe(false); // 24:00 (<= 1440)
      expect(isOvernight('23:30', 45)).toBe(true); // 00:15 (> 1440)
      expect(isOvernight('22:00', 180)).toBe(true); // 01:00 (> 1440)
    });
  });

  describe('Timezone Conversions & DST Round-trips', () => {
    it('converts local wall-clock to UTC and formats back accurately (Europe/Paris)', () => {
      const localDate = '2026-09-04';
      const localTime = '09:30';
      const tz = 'Europe/Paris'; // UTC+2 in September (CEST)

      const { isValid, utcDate } = verifyTimezoneRoundTrip(localDate, localTime, tz);
      expect(isValid).toBe(true);
      expect(utcDate.toISOString()).toBe('2026-09-04T07:30:00.000Z');

      const formatted = formatUtcToLocal(utcDate, tz);
      expect(formatted.localDate).toBe(localDate);
      expect(formatted.localTime).toBe(localTime);
    });

    it('converts local wall-clock in winter time accurately (Europe/Paris)', () => {
      const localDate = '2026-12-15';
      const localTime = '14:00';
      const tz = 'Europe/Paris'; // UTC+1 in December (CET)

      const { isValid, utcDate } = verifyTimezoneRoundTrip(localDate, localTime, tz);
      expect(isValid).toBe(true);
      expect(utcDate.toISOString()).toBe('2026-12-15T13:00:00.000Z');

      const formatted = formatUtcToLocal(utcDate, tz);
      expect(formatted.localDate).toBe(localDate);
      expect(formatted.localTime).toBe(localTime);
    });
  });

  describe('Interval Operations (Merge & Subtract)', () => {
    it('merges contiguous and overlapping intervals', () => {
      const intervals = [
        { startMinutes: 540, endMinutes: 720 }, // 09:00 - 12:00
        { startMinutes: 660, endMinutes: 780 }, // 11:00 - 13:00
        { startMinutes: 840, endMinutes: 1020 }, // 14:00 - 17:00
      ];
      const merged = mergeIntervals(intervals);
      expect(merged).toEqual([
        { startMinutes: 540, endMinutes: 780 }, // 09:00 - 13:00
        { startMinutes: 840, endMinutes: 1020 }, // 14:00 - 17:00
      ]);
    });

    it('subtracts closed intervals from open intervals with closed precedence', () => {
      const open = [{ startMinutes: 540, endMinutes: 1020 }]; // 09:00 - 17:00 (540 - 1020)
      const closed = [
        { startMinutes: 720, endMinutes: 840 }, // 12:00 - 14:00 lunch break
      ];
      const result = subtractIntervals(open, closed);
      expect(result).toEqual([
        { startMinutes: 540, endMinutes: 720 }, // 09:00 - 12:00
        { startMinutes: 840, endMinutes: 1020 }, // 14:00 - 17:00
      ]);
    });

    it('completely removes open interval if closed covers it entirely', () => {
      const open = [{ startMinutes: 540, endMinutes: 720 }]; // 09:00 - 12:00
      const closed = [{ startMinutes: 500, endMinutes: 800 }]; // 08:20 - 13:20
      const result = subtractIntervals(open, closed);
      expect(result).toEqual([]);
    });
  });

  describe('computeEffectiveAvailability & isSlotAvailable', () => {
    const baseRule: AvailabilityRuleDTO = {
      id: 'rule-1',
      organizationId: 'org-1',
      practitionerId: 'prac-1',
      locationId: 'loc-1',
      weekday: 5, // Friday
      startTime: '09:00',
      endTime: '17:00',
      validFrom: '2026-09-01',
      validUntil: '2026-12-31',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    it('accepts slot within weekly availability', () => {
      const intervals = computeEffectiveAvailability({
        localDate: '2026-09-04', // Friday
        rules: [baseRule],
        exceptions: [],
      });

      expect(intervals).toEqual([{ startMinutes: 540, endMinutes: 1020 }]); // 09:00 - 17:00

      // 09:30 for 45 min -> 09:30 to 10:15 (570 to 615) -> Available
      expect(
        isSlotAvailable({
          localStartTime: '09:30',
          durationMinutes: 45,
          availableIntervals: intervals,
        })
      ).toBe(true);

      // 16:30 for 45 min -> 16:30 to 17:15 (990 to 1035) -> Exceeds 17:00 -> Rejected
      expect(
        isSlotAvailable({
          localStartTime: '16:30',
          durationMinutes: 45,
          availableIntervals: intervals,
        })
      ).toBe(false);

      // Outside working hours (08:00) -> Rejected
      expect(
        isSlotAvailable({
          localStartTime: '08:00',
          durationMinutes: 30,
          availableIntervals: intervals,
        })
      ).toBe(false);
    });

    it('ignores rule if date is outside validity period (expired or future)', () => {
      // Future rule
      const futureRule: AvailabilityRuleDTO = {
        ...baseRule,
        validFrom: '2026-10-01',
      };
      const intervalsFuture = computeEffectiveAvailability({
        localDate: '2026-09-04',
        rules: [futureRule],
        exceptions: [],
      });
      expect(intervalsFuture).toEqual([]);

      // Expired rule
      const expiredRule: AvailabilityRuleDTO = {
        ...baseRule,
        validUntil: '2026-09-01',
      };
      const intervalsExpired = computeEffectiveAvailability({
        localDate: '2026-09-04',
        rules: [expiredRule],
        exceptions: [],
      });
      expect(intervalsExpired).toEqual([]);
    });

    it('adds availability when open exception is present', () => {
      // Practitioner normally not working on Saturday (6)
      const openException: AvailabilityExceptionDTO = {
        id: 'exc-1',
        organizationId: 'org-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-05', // Saturday
        kind: 'open',
        startTime: '10:00',
        endTime: '13:00',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const intervals = computeEffectiveAvailability({
        localDate: '2026-09-05',
        rules: [baseRule], // Friday only
        exceptions: [openException],
      });

      expect(intervals).toEqual([{ startMinutes: 600, endMinutes: 780 }]); // 10:00 - 13:00

      expect(
        isSlotAvailable({
          localStartTime: '10:30',
          durationMinutes: 60,
          availableIntervals: intervals,
        })
      ).toBe(true);
    });

    it('removes availability when closed exception is present', () => {
      const closedException: AvailabilityExceptionDTO = {
        id: 'exc-2',
        organizationId: 'org-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-04', // Friday
        kind: 'closed',
        startTime: '12:00',
        endTime: '14:00',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const intervals = computeEffectiveAvailability({
        localDate: '2026-09-04',
        rules: [baseRule],
        exceptions: [closedException],
      });

      expect(intervals).toEqual([
        { startMinutes: 540, endMinutes: 720 }, // 09:00 - 12:00
        { startMinutes: 840, endMinutes: 1020 }, // 14:00 - 17:00
      ]);

      // 12:30 is closed
      expect(
        isSlotAvailable({
          localStartTime: '12:30',
          durationMinutes: 30,
          availableIntervals: intervals,
        })
      ).toBe(false);
    });

    it('full-day closed exception wipes all availability (CLOSED WINS ALWAYS)', () => {
      const fullDayClosed: AvailabilityExceptionDTO = {
        id: 'exc-full',
        organizationId: 'org-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-04',
        kind: 'closed',
        startTime: null,
        endTime: null,
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const openException: AvailabilityExceptionDTO = {
        id: 'exc-open',
        organizationId: 'org-1',
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        localDate: '2026-09-04',
        kind: 'open',
        startTime: '18:00',
        endTime: '20:00',
        isActive: true,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const intervals = computeEffectiveAvailability({
        localDate: '2026-09-04',
        rules: [baseRule],
        exceptions: [openException, fullDayClosed],
      });

      expect(intervals).toEqual([]);
      expect(
        isSlotAvailable({
          localStartTime: '10:00',
          durationMinutes: 30,
          availableIntervals: intervals,
        })
      ).toBe(false);
    });
  });

  describe('doAvailabilityRulesOverlap', () => {
    it('detects overlapping rules for same practitioner, location, weekday and overlapping date/time', () => {
      const rule1 = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        weekday: 1,
        startTime: '09:00',
        endTime: '13:00',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
      };
      const rule2 = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        weekday: 1,
        startTime: '12:00',
        endTime: '17:00',
        validFrom: '2026-10-01',
        validUntil: '2027-01-31',
      };
      expect(doAvailabilityRulesOverlap(rule1, rule2)).toBe(true);
    });

    it('returns false if different weekday, different location, or non-overlapping time', () => {
      const rule1 = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        weekday: 1,
        startTime: '09:00',
        endTime: '12:00',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
      };
      const rule2 = {
        practitionerId: 'prac-1',
        locationId: 'loc-1',
        weekday: 1,
        startTime: '12:00',
        endTime: '17:00',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
      };
      // 09:00-12:00 and 12:00-17:00 are back-to-back (not overlapping)
      expect(doAvailabilityRulesOverlap(rule1, rule2)).toBe(false);
    });
  });
});
