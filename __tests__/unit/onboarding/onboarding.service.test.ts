import { describe, it, expect } from 'vitest';
import { getOnboardingSteps } from '@/lib/services/onboarding.service';
import { PARAMEDICAL_PROFESSION_CODES, PARAMEDICAL_PROFESSIONS } from '@/lib/workspaces/paramedical/professions';
import { OnboardingContext } from '@/lib/onboarding/types';
import { TOUR_SCENARIOS } from '@/components/onboarding/definitions/tour-scenarios';

const validatePlan = (steps: ReturnType<typeof getOnboardingSteps>) => {
  const ids = steps.map(s => s.id);
  
  // Unique IDs
  expect(new Set(ids).size).toBe(ids.length);
  
  // Ordered IDs
  expect(ids).toEqual([...ids].sort((a, b) => a - b));

  // Required steps actions must exist in TOUR_SCENARIOS or be naturally completable
  steps.forEach(step => {
    if (step.required) {
      if (step.action === 'welcome') return; // welcome is not a tour
      if (step.action === 'complete_company_profile' || step.action === 'complete_profile') return; // link based
      expect(TOUR_SCENARIOS[step.action]).toBeDefined();
    }
  });
};

describe('Onboarding Service', () => {
  it('client retourne plan client', () => {
    const ctx: OnboardingContext = { profileType: 'client' };
    const steps = getOnboardingSteps(ctx);
    expect(steps.find(s => s.action === 'post_request')).toBeDefined();
    validatePlan(steps);
  });

  it('professional artisan retourne plan générique/artisan', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'artisan' };
    const steps = getOnboardingSteps(ctx);
    expect(steps.find(s => s.action === 'add_services')).toBeDefined();
    validatePlan(steps);
  });

  it('professional freelance retourne plan générique', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'freelance' };
    const steps = getOnboardingSteps(ctx);
    expect(steps.find(s => s.action === 'add_client')).toBeDefined();
    expect(steps.find(s => s.action === 'add_services')).toBeUndefined();
    validatePlan(steps);
  });

  it('professional other retourne plan générique', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'other' };
    const steps = getOnboardingSteps(ctx);
    expect(steps.find(s => s.action === 'add_client')).toBeDefined();
    validatePlan(steps);
  });

  it('secteur inconnu retourne generic', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'unknown' };
    const steps = getOnboardingSteps(ctx);
    expect(steps.find(s => s.action === 'add_client')).toBeDefined();
    validatePlan(steps);
  });

  it('health + physiotherapist retourne plan paramedical avec le bon label', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'health', profession: 'physiotherapist' };
    const steps = getOnboardingSteps(ctx);
    const profileStep = steps.find(s => s.action === 'complete_company_profile');
    expect(profileStep?.description).toContain('Kinésithérapeute');
    validatePlan(steps);
  });

  it('health + osteopath retourne plan paramedical avec le bon label', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'health', profession: 'osteopath' };
    const steps = getOnboardingSteps(ctx);
    const profileStep = steps.find(s => s.action === 'complete_company_profile');
    expect(profileStep?.description).toContain('Ostéopathe');
    validatePlan(steps);
  });

  it('boucle sur toutes les professions paramédicales', () => {
    PARAMEDICAL_PROFESSION_CODES.forEach(code => {
      const ctx: OnboardingContext = { profileType: 'professional', sector: 'health', profession: code };
      const steps = getOnboardingSteps(ctx);
      const profileStep = steps.find(s => s.action === 'complete_company_profile');
      const label = PARAMEDICAL_PROFESSIONS[code].label;
      expect(profileStep?.description).toContain(label);
      validatePlan(steps);
    });
  });

  it('health + profession undefined retourne paramedical base', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'health' };
    const steps = getOnboardingSteps(ctx);
    const profileStep = steps.find(s => s.action === 'complete_company_profile');
    expect(profileStep?.description).toBe('Ajoutez vos coordonnées, votre adresse professionnelle et les informations utiles de votre structure.');
    validatePlan(steps);
  });

  it('health + profession inconnue retourne paramedical base', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'health', profession: 'fake_profession' };
    const steps = getOnboardingSteps(ctx);
    const profileStep = steps.find(s => s.action === 'complete_company_profile');
    expect(profileStep?.description).toBe('Ajoutez vos coordonnées, votre adresse professionnelle et les informations utiles de votre structure.');
    validatePlan(steps);
  });

  it('paramedical ne contient PAS action add_client', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'health', profession: 'physiotherapist' };
    const steps = getOnboardingSteps(ctx);
    expect(steps.find(s => s.action === 'add_client')).toBeUndefined();
  });

  it('paramedical ne contient aucune route /patients ni routes cliniques futures', () => {
    const ctx: OnboardingContext = { profileType: 'professional', sector: 'health', profession: 'physiotherapist' };
    const steps = getOnboardingSteps(ctx);
    
    steps.forEach(step => {
      if (step.link) {
        expect(step.link).not.toContain('/patients');
        expect(step.link).not.toContain('/clinical');
        expect(step.link).not.toContain('/encounters');
        expect(step.link).not.toContain('/appointments');
      }
    });
  });
});
