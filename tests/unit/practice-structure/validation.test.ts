import { describe, it, expect } from 'vitest';
import { 
  practiceLocationCreateSchema, 
  practicePractitionerCreateSchema 
} from '@/lib/practice-structure/validation';

describe('Practice Structure Validation', () => {
  it('validates a correct location', () => {
    const data = {
      name: 'Cabinet Principal',
      timezone: 'Europe/Paris'
    };
    expect(practiceLocationCreateSchema.parse(data)).toEqual(data);
  });

  it('rejects an invalid timezone', () => {
    const data = {
      name: 'Cabinet',
      timezone: 'Invalid/Timezone'
    };
    expect(() => practiceLocationCreateSchema.parse(data)).toThrow(/Fuseau horaire invalide/);
  });

  it('validates a correct practitioner', () => {
    const data = {
      displayName: 'Dr. House',
      profession: 'osteopath'
    };
    expect(practicePractitionerCreateSchema.parse(data)).toEqual(data);
  });

  it('rejects an invalid profession', () => {
    const data = {
      displayName: 'Dr. Who',
      profession: 'time_lord'
    };
    expect(() => practicePractitionerCreateSchema.parse(data)).toThrow(/Profession invalide/);
  });
});
