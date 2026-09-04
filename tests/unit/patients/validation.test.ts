import { describe, it, expect } from 'vitest';
import {
  patientCreateSchema,
  patientRepresentativeCreateSchema,
  patientRepresentativeLinkCreateSchema,
  patientListFiltersSchema,
} from '@/lib/patients/validation';

describe('Patient Validation Schemas', () => {
  describe('patientCreateSchema', () => {
    it('validates a correct minimal patient input', () => {
      const input = {
        birthName: 'DUPONT',
        firstBirthName: 'Marie',
        birthDate: '1990-05-15',
        sex: 'female',
      };

      const parsed = patientCreateSchema.parse(input);
      expect(parsed.birthName).toBe('DUPONT');
      expect(parsed.firstBirthName).toBe('Marie');
      expect(parsed.birthDate).toBe('1990-05-15');
      expect(parsed.sex).toBe('female');
      expect(parsed.birthFirstNames).toBeNull();
      expect(parsed.email).toBeNull();
    });

    it('validates a complete patient input with all fields', () => {
      const input = {
        birthName: 'DUPONT',
        firstBirthName: 'Jean',
        birthFirstNames: 'Jean Marie Pierre',
        usedName: 'MARTIN',
        usedFirstName: 'Jean-Luc',
        birthDate: '1985-10-20',
        sex: 'male',
        birthPlace: 'Lyon',
        birthPlaceCode: '69123',
        birthCountry: 'France',
        email: 'jean.martin@example.com',
        phone: '0612345678',
        address: '10 rue de la République',
        city: 'Lyon',
        postalCode: '69002',
        country: 'France',
      };

      const parsed = patientCreateSchema.parse(input);
      expect(parsed.usedName).toBe('MARTIN');
      expect(parsed.birthPlaceCode).toBe('69123');
      expect(parsed.email).toBe('jean.martin@example.com');
    });

    it('rejects empty birthName or firstBirthName', () => {
      expect(() =>
        patientCreateSchema.parse({
          birthName: '   ',
          firstBirthName: 'Jean',
          birthDate: '1990-01-01',
          sex: 'male',
        })
      ).toThrow();

      expect(() =>
        patientCreateSchema.parse({
          birthName: 'DUPONT',
          firstBirthName: '',
          birthDate: '1990-01-01',
          sex: 'male',
        })
      ).toThrow();
    });

    it('rejects invalid sex enum', () => {
      expect(() =>
        patientCreateSchema.parse({
          birthName: 'DUPONT',
          firstBirthName: 'Jean',
          birthDate: '1990-01-01',
          sex: 'invalid_sex',
        })
      ).toThrow();
    });

    it('rejects impossible calendar birth dates', () => {
      // 2024-02-30 (February 30 doesn't exist)
      expect(() =>
        patientCreateSchema.parse({
          birthName: 'DUPONT',
          firstBirthName: 'Jean',
          birthDate: '2024-02-30',
          sex: 'male',
        })
      ).toThrow();

      // Month 13
      expect(() =>
        patientCreateSchema.parse({
          birthName: 'DUPONT',
          firstBirthName: 'Jean',
          birthDate: '2024-13-10',
          sex: 'male',
        })
      ).toThrow();
    });

    it('rejects future birth dates', () => {
      expect(() =>
        patientCreateSchema.parse({
          birthName: 'DUPONT',
          firstBirthName: 'Jean',
          birthDate: '2099-01-01',
          sex: 'male',
        })
      ).toThrow();
    });

    it('rejects invalid email formats', () => {
      expect(() =>
        patientCreateSchema.parse({
          birthName: 'DUPONT',
          firstBirthName: 'Jean',
          birthDate: '1990-01-01',
          sex: 'male',
          email: 'not-an-email',
        })
      ).toThrow();
    });
  });

  describe('patientRepresentativeCreateSchema', () => {
    it('validates a valid representative', () => {
      const input = {
        firstName: 'Sophie',
        lastName: 'DUPONT',
        email: 'sophie.dupont@example.com',
        phone: '0688776655',
      };
      const parsed = patientRepresentativeCreateSchema.parse(input);
      expect(parsed.firstName).toBe('Sophie');
      expect(parsed.lastName).toBe('DUPONT');
      expect(parsed.email).toBe('sophie.dupont@example.com');
    });

    it('rejects empty first or last name', () => {
      expect(() =>
        patientRepresentativeCreateSchema.parse({
          firstName: '  ',
          lastName: 'DUPONT',
        })
      ).toThrow();
    });
  });

  describe('patientRepresentativeLinkCreateSchema', () => {
    it('validates link with default flags', () => {
      const parsed = patientRepresentativeLinkCreateSchema.parse({
        relationship: 'parent',
      });
      expect(parsed.relationship).toBe('parent');
      expect(parsed.isLegalRepresentative).toBe(false);
      expect(parsed.isPrimaryContact).toBe(false);
    });

    it('validates link with custom flags', () => {
      const parsed = patientRepresentativeLinkCreateSchema.parse({
        relationship: 'legal_guardian',
        isLegalRepresentative: true,
        isPrimaryContact: true,
        isEmergencyContact: true,
        isBillingContact: true,
      });
      expect(parsed.relationship).toBe('legal_guardian');
      expect(parsed.isLegalRepresentative).toBe(true);
      expect(parsed.isPrimaryContact).toBe(true);
    });

    it('rejects invalid relationship code', () => {
      expect(() =>
        patientRepresentativeLinkCreateSchema.parse({
          relationship: 'best_friend',
        })
      ).toThrow();
    });
  });

  describe('patientListFiltersSchema', () => {
    it('parses valid default filters', () => {
      const parsed = patientListFiltersSchema.parse({});
      expect(parsed.active).toBe('active');
      expect(parsed.limit).toBe(25);
      expect(parsed.offset).toBe(0);
    });

    it('coerces limit and offset numbers', () => {
      const parsed = patientListFiltersSchema.parse({
        limit: '10',
        offset: '20',
        active: 'all',
        birthName: '  Dupont  ',
      });
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(20);
      expect(parsed.active).toBe('all');
      expect(parsed.birthName).toBe('Dupont');
    });

    it('validates birthDate filter with real calendar date or normalizes empty to null', () => {
      // Valid calendar date
      const valid = patientListFiltersSchema.parse({ birthDate: '1990-05-15' });
      expect(valid.birthDate).toBe('1990-05-15');

      // Empty string normalized to null
      const empty = patientListFiltersSchema.parse({ birthDate: '   ' });
      expect(empty.birthDate).toBeNull();

      // Invalid calendar date (February 30)
      expect(() => patientListFiltersSchema.parse({ birthDate: '2024-02-30' })).toThrow();

      // Invalid format (not a date string)
      expect(() => patientListFiltersSchema.parse({ birthDate: 'foo' })).toThrow();
    });
  });
});
