import { describe, it, expect } from 'vitest';
import { 
  practiceLocationCreateSchema, 
  practiceLocationUpdateSchema,
  practicePractitionerCreateSchema,
  practicePractitionerUpdateSchema,
  practitionerLocationsSetSchema,
  practiceRoomCreateSchema,
  practiceRoomUpdateSchema,
  practiceResourceCreateSchema,
  practiceResourceUpdateSchema,
} from '@/lib/practice-structure/validation';
import { PARAMEDICAL_PROFESSION_CODES } from '@/lib/workspaces/paramedical/professions';

describe('Practice Structure Validation Schemas', () => {
  const dummyLoc1 = '10000000-0000-4000-8000-000000000001';
  const dummyLoc2 = '10000000-0000-4000-8000-000000000002';
  const dummyRoom1 = '10000000-0000-4000-8000-000000000003';

  describe('Location Schemas', () => {
    it('validates a valid location create input', () => {
      const data = {
        name: 'Cabinet Médical',
        address: '123 Avenue des Champs',
        city: 'Paris',
        postalCode: '75008',
        country: 'France',
        timezone: 'Europe/Paris',
        phone: '0102030405',
      };
      const parsed = practiceLocationCreateSchema.parse(data);
      expect(parsed.name).toBe('Cabinet Médical');
      expect(parsed.timezone).toBe('Europe/Paris');
    });

    it('accepts valid IANA timezones (Europe/Paris, Europe/Luxembourg)', () => {
      const dataParis = { name: 'Cab Paris', timezone: 'Europe/Paris' };
      const parsedParis = practiceLocationCreateSchema.parse(dataParis);
      expect(parsedParis.timezone).toBe('Europe/Paris');

      const dataLux = { name: 'Cab Luxembourg', timezone: 'Europe/Luxembourg' };
      const parsedLux = practiceLocationCreateSchema.parse(dataLux);
      expect(parsedLux.timezone).toBe('Europe/Luxembourg');
    });

    it('rejects invalid timezones (Europe/Nancy, Paris, Mars/Phobos)', () => {
      expect(() => practiceLocationCreateSchema.parse({ name: 'Cab', timezone: 'Europe/Nancy' }))
        .toThrow(/Fuseau horaire invalide/);
      expect(() => practiceLocationCreateSchema.parse({ name: 'Cab', timezone: 'Paris' }))
        .toThrow(/Fuseau horaire invalide/);
      expect(() => practiceLocationCreateSchema.parse({ name: 'Cab', timezone: 'Mars/Phobos' }))
        .toThrow(/Fuseau horaire invalide/);
    });

    it('defaults timezone to Europe/Paris when not specified', () => {
      const data = {
        name: 'Cabinet Défaut',
      };
      const parsed = practiceLocationCreateSchema.parse(data);
      expect(parsed.timezone).toBe('Europe/Paris');
    });

    it('validates partial updates on location', () => {
      const data = {
        city: 'Lyon',
      };
      const parsed = practiceLocationUpdateSchema.parse(data);
      expect(parsed.city).toBe('Lyon');
    });
  });

  describe('Practitioner Schemas', () => {
    it.each(PARAMEDICAL_PROFESSION_CODES)('accepts valid paramedical profession: %s', (profession) => {
      const data = {
        displayName: 'Dr. Test',
        profession,
        email: 'test@example.com',
      };
      const parsed = practicePractitionerCreateSchema.parse(data);
      expect(parsed.profession).toBe(profession);
    });

    it('rejects an invalid profession code', () => {
      const data = {
        displayName: 'Dr. Invalid',
        profession: 'dentist',
      };
      expect(() => practicePractitionerCreateSchema.parse(data)).toThrow();
    });

    it('accepts null or optional email, phone, and userId', () => {
      const data = {
        displayName: 'Dr. Minimal',
        profession: 'physiotherapist' as const,
        userId: null,
        email: null,
      };
      const parsed = practicePractitionerCreateSchema.parse(data);
      expect(parsed.displayName).toBe('Dr. Minimal');
      expect(parsed.userId).toBeNull();
    });

    it('validates partial practitioner updates', () => {
      const data = {
        displayName: 'Dr. Updated Name',
      };
      const parsed = practicePractitionerUpdateSchema.parse(data);
      expect(parsed.displayName).toBe('Dr. Updated Name');
    });
  });

  describe('Assignments Schema', () => {
    it('accepts assignments with at most 1 primary location', () => {
      const data = [
        { locationId: dummyLoc1, isPrimary: true },
        { locationId: dummyLoc2, isPrimary: false },
      ];
      const parsed = practitionerLocationsSetSchema.parse(data);
      expect(parsed).toHaveLength(2);
    });

    it('rejects assignments with multiple primary locations', () => {
      const data = [
        { locationId: dummyLoc1, isPrimary: true },
        { locationId: dummyLoc2, isPrimary: true },
      ];
      expect(() => practitionerLocationsSetSchema.parse(data)).toThrow(/Un seul lieu principal/);
    });

    it('accepts empty assignments array', () => {
      const data: Array<{ locationId: string; isPrimary: boolean }> = [];
      const parsed = practitionerLocationsSetSchema.parse(data);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('Room and Resource Schemas', () => {
    it('validates room create and update', () => {
      const createData = {
        locationId: dummyLoc1,
        name: 'Salle A',
        description: 'Grande salle',
      };
      const parsedCreate = practiceRoomCreateSchema.parse(createData);
      expect(parsedCreate.name).toBe('Salle A');

      const updateData = { name: 'Salle B' };
      const parsedUpdate = practiceRoomUpdateSchema.parse(updateData);
      expect(parsedUpdate.name).toBe('Salle B');
    });

    it('validates resource create and update', () => {
      const createData = {
        locationId: dummyLoc1,
        roomId: dummyRoom1,
        name: 'Table manipulation',
      };
      const parsedCreate = practiceResourceCreateSchema.parse(createData);
      expect(parsedCreate.roomId).toBe(dummyRoom1);

      const updateData = { description: 'Nouvelle description' };
      const parsedUpdate = practiceResourceUpdateSchema.parse(updateData);
      expect(parsedUpdate.description).toBe('Nouvelle description');
    });
  });
});
