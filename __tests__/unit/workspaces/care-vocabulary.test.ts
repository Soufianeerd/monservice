import { describe, expect, it } from 'vitest';
import { adaptCareText, adaptCareTexts, vocabularyFromCustomerTerm } from '@/lib/workspaces/paramedical/vocabulary';
import { resolveWorkspace } from '@/lib/workspaces/resolver';

describe('Vocabulaire santé et bien-être', () => {
  it('garde « patient » pour les professions de santé', () => {
    const kine = resolveWorkspace({ sector: 'health', profession: 'physiotherapist' });
    expect(vocabularyFromCustomerTerm(kine.terminology.customerSingular)).toBe('patient');
    expect(adaptCareText('Ajouter un patient', 'patient')).toBe('Ajouter un patient');
  });

  it('parle de « client » et d’« activité » pour le coach, le nutritionniste et le massage', () => {
    for (const profession of ['sport_coach', 'nutritionist', 'wellness_massage']) {
      const workspace = resolveWorkspace({ sector: 'health', profession });
      expect(vocabularyFromCustomerTerm(workspace.terminology.customerSingular)).toBe('client');
    }
    expect(adaptCareText('Un patient archivé reste conservé dans votre cabinet.', 'client')).toBe('Un client archivé reste conservé dans votre activité.');
    expect(adaptCareText('Votre journée au cabinet', 'client')).toBe('Votre journée');
    expect(adaptCareText('Tous les patients', 'client')).toBe('Tous les clients');
  });

  it('ne touche ni aux sélecteurs ni aux identifiants', () => {
    const help = { title: 'Ajouter un patient', target: 'main a[href="/patients/new"]', id: 'facture-patient' };
    expect(adaptCareTexts(help, 'client')).toEqual({ title: 'Ajouter un client', target: 'main a[href="/patients/new"]', id: 'facture-patient' });
  });
});
