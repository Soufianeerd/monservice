import { describe, it, expect } from 'vitest';
import { buildProfessionalNavigation } from '@/lib/navigation/workspace-navigation';
import { WorkspaceConfig } from '@/lib/workspaces/types';
import { PARAMEDICAL_PROFESSIONS } from '@/lib/workspaces/paramedical/professions';

describe('Workspace Navigation', () => {
  it('construit la navigation générique correcte', () => {
    const config = {
      type: 'generic',
      label: 'CRM',
    } as WorkspaceConfig;

    const nav = buildProfessionalNavigation(config);
    const navNames = nav.map(n => n.name);
    
    // Ordre historique conservé
    expect(navNames).toEqual([
      'Tableau de bord',
      'Clients',
      'Deals',
      'Facturation',
      'Agenda',
      'Marketplace',
      'Messagerie',
      'Paramètres'
    ]);

    // dataTour conservés
    expect(nav.find(n => n.id === 'clients')?.dataTour).toBe('clients-nav');
    expect(nav.find(n => n.id === 'settings')?.dataTour).toBe('settings-nav');
  });

  it('construit la navigation paramédicale avec les modules adéquats', () => {
    const config = {
      type: 'paramedical',
      profession: 'physiotherapist',
      label: 'Masseur-Kinésithérapeute',
      terminology: {
        customerPlural: 'Patients',
        servicePlural: 'Séances',
      },
      capabilities: ['patients'],
    } as unknown as WorkspaceConfig;

    const nav = buildProfessionalNavigation(config);
    const navNames = nav.map(n => n.name);

    // Patients est absent même si capability 'patients' est présente
    expect(navNames).not.toContain('Patients');
    
    // Modules exclus
    expect(navNames).not.toContain('Clients');
    expect(navNames).not.toContain('Deals');
    expect(navNames).not.toContain('Marketplace');
    expect(navNames).not.toContain('Messagerie');

    // Modules inclus
    expect(navNames).toContain('Tableau de bord');
    expect(navNames).toContain('Facturation');
    expect(navNames).toContain('Agenda');
    expect(navNames).toContain('Paramètres');

    // dataTour settings conservé
    expect(nav.find(n => n.id === 'settings')?.dataTour).toBe('settings-nav');

    // Produit le label à partir de servicePlural
    const facturation = nav.find(n => n.id === 'billing');
    expect(facturation?.subItems?.map(sub => sub.name)).toContain('Séances');
  });

  it('gère le paramédical de base (health sans profession connue)', () => {
    const config = {
      type: 'paramedical',
      label: 'Espace Paramédical',
      // terminology undefined intentionally
      capabilities: [],
    } as unknown as WorkspaceConfig;

    const nav = buildProfessionalNavigation(config);
    
    // Le label par défaut est 'Prestations' si la terminologie n'existe pas
    const facturation = nav.find(n => n.id === 'billing');
    expect(facturation?.subItems?.map(sub => sub.name)).toContain('Prestations');
  });
  
  it('ne crée aucune route future automatique à partir des capabilities', () => {
    const config = {
      type: 'paramedical',
      profession: 'osteopath',
      label: 'Ostéopathe',
      terminology: {
        customerPlural: 'Patients',
        servicePlural: 'Consultations',
      },
      capabilities: ['patients', 'clinicalRecords', 'careEpisodes', 'appointments'], // futures capacités
    } as unknown as WorkspaceConfig;

    const nav = buildProfessionalNavigation(config);
    
    // Aucune de ces capabilities ne devrait avoir généré un menu
    const hrefs = nav.flatMap(n => [n.href, ...(n.subItems?.map(sub => sub.href) || [])]);
    
    expect(hrefs.some(h => h.includes('patients'))).toBe(false);
    expect(hrefs.some(h => h.includes('clinical'))).toBe(false);
    expect(hrefs.some(h => h.includes('encounters'))).toBe(false);
    expect(hrefs.some(h => h.includes('care'))).toBe(false);
  });
  
  it('valide l\'absence de collision d\'IDs sur toutes les professions', () => {
    const codes = Object.keys(PARAMEDICAL_PROFESSIONS) as Array<keyof typeof PARAMEDICAL_PROFESSIONS>;
    
    codes.forEach(code => {
      const config = {
        type: 'paramedical',
        profession: code,
        label: PARAMEDICAL_PROFESSIONS[code].label,
      } as unknown as WorkspaceConfig;
      
      const nav = buildProfessionalNavigation(config);
      const ids = nav.map(n => n.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
