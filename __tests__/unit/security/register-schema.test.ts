import { describe, it, expect } from 'vitest';
import { registerSchema } from '../../../src/lib/validation/schemas';
import { PARAMEDICAL_PROFESSION_CODES } from '../../../src/lib/workspaces/paramedical/professions';
import { FIELD_SERVICE_PROFESSION_CODES } from '../../../src/lib/workspaces/field-service/professions';
import { REGISTRATION_SECTOR_CODES } from '../../../src/lib/registration/options';

describe('Security: registerSchema validation', () => {
  it('1. client standard accepté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client'
    });
    expect(result.success).toBe(true);
  });

  it('2. professional freelance + orgName + sans profession accepté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'My Freelance Corp',
      sector: 'freelance'
    });
    expect(result.success).toBe(true);
  });

  it('3. professional health + physiotherapist accepté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Kine Corp',
      sector: 'health',
      profession: 'physiotherapist'
    });
    expect(result.success).toBe(true);
  });

  it('4. professional health + osteopath accepté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Osteo Corp',
      sector: 'health',
      profession: 'osteopath'
    });
    expect(result.success).toBe(true);
  });

  it('5. boucler sur les codes officiels health : chacun accepté', () => {
    PARAMEDICAL_PROFESSION_CODES.forEach((code) => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        profileType: 'professional',
        orgName: 'Health Corp',
        sector: 'health',
        profession: code
      });
      expect(result.success).toBe(true);
    });
  });

  it('5b. boucler sur les 36 codes officiels field_services : chacun accepté', () => {
    FIELD_SERVICE_PROFESSION_CODES.forEach((code) => {
      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        profileType: 'professional',
        orgName: 'Field Service Corp',
        sector: 'field_services',
        profession: code
      });
      expect(result.success).toBe(true);
    });
  });

  it('6. professional health sans profession rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Health Corp',
      sector: 'health'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Veuillez sélectionner une profession");
    }
  });

  it('6b. professional field_services sans profession rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Artisan Corp',
      sector: 'field_services'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Veuillez sélectionner un métier");
    }
  });

  it('7. professional health + doctor rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Health Corp',
      sector: 'health',
      profession: 'doctor'
    });
    expect(result.success).toBe(false);
  });

  it('8. professional health + random rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Health Corp',
      sector: 'health',
      profession: 'random'
    });
    expect(result.success).toBe(false);
  });

  it('9. professional health + empty string rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Health Corp',
      sector: 'health',
      profession: ''
    });
    expect(result.success).toBe(false);
  });

  it('10. professional field_services + health profession rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Artisan Corp',
      sector: 'field_services',
      profession: 'physiotherapist'
    });
    expect(result.success).toBe(false);
  });

  it('10b. professional health + field_services profession rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Health Corp',
      sector: 'health',
      profession: 'plumber'
    });
    expect(result.success).toBe(false);
  });

  it('11. professional freelance + profession rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Freelance Corp',
      sector: 'freelance',
      profession: 'osteopath'
    });
    expect(result.success).toBe(false);
  });

  it('12. client + physiotherapist rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client',
      profession: 'physiotherapist'
    });
    expect(result.success).toBe(false);
  });

  it('13. professional sans orgName rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      sector: 'freelance'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Le nom de l'entreprise est requis");
    }
  });

  it('14. professional sans sector rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Corp'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Le secteur d'activité est requis");
    }
  });

  it('15. payload avec champ inconnu rejeté (mass assignment protection)', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client',
      isAdmin: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
    }
  });

  it('16. client + orgName rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client',
      orgName: 'My Client Corp',
    });
    expect(result.success).toBe(false);
  });

  it('17. client + sector health rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client',
      sector: 'health',
    });
    expect(result.success).toBe(false);
  });

  it('18. client + sector field_services rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client',
      sector: 'field_services',
    });
    expect(result.success).toBe(false);
  });

  it('19. client + orgName + sector rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'client',
      orgName: 'My Client Corp',
      sector: 'health',
    });
    expect(result.success).toBe(false);
  });

  it('20. professional + sector hacker rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Corp',
      sector: 'hacker',
    });
    expect(result.success).toBe(false);
  });

  it('21. professional + sector healthcare rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Corp',
      sector: 'healthcare',
    });
    expect(result.success).toBe(false);
  });

  it('22. professional + sector chaîne vide rejeté', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Corp',
      sector: '',
    });
    expect(result.success).toBe(false);
  });

  it('23. tous les REGISTRATION_SECTOR_CODES sont cohérents avec le contrat', () => {
    for (const sector of REGISTRATION_SECTOR_CODES) {
      const profession =
        sector === 'health'
          ? 'physiotherapist'
          : sector === 'field_services'
          ? 'plumber'
          : undefined;

      const result = registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        profileType: 'professional',
        orgName: 'Corp',
        sector,
        ...(profession ? { profession } : {}),
      });
      expect(result.success).toBe(true);
    }
  });

  it('24. profession non officielle reste rejetée pour health et field_services', () => {
    const resultHealth = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Corp',
      sector: 'health',
      profession: 'medecin_generaliste',
    });
    expect(resultHealth.success).toBe(false);

    const resultField = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      profileType: 'professional',
      orgName: 'Corp',
      sector: 'field_services',
      profession: 'astronaute',
    });
    expect(resultField.success).toBe(false);
  });
});
