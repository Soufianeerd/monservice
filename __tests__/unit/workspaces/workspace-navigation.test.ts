import { describe, it, expect } from 'vitest';
import { buildProfessionalNavigation } from '@/lib/navigation/workspace-navigation';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { PARAMEDICAL_PROFESSION_CODES } from '@/lib/workspaces/paramedical/professions';

describe('Workspace Navigation', () => {
  it('construit la navigation générique correcte', () => {
    const config = resolveWorkspace({
      sector: 'artisan',
    });

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

    // Generic: Clients présent, Patients absent, /patients absent
    expect(navNames).toContain('Clients');
    expect(navNames).not.toContain('Patients');
    const genericHrefs = nav.flatMap(n => [n.href, ...(n.subItems?.map(sub => sub.href) || [])]);
    expect(genericHrefs.some(h => h === '/patients' || h.includes('patients'))).toBe(false);

    // dataTour conservés
    expect(nav.find(n => n.id === 'clients')?.dataTour).toBe('clients-nav');
    expect(nav.find(n => n.id === 'settings')?.dataTour).toBe('settings-nav');

    // Generic settings ne contient PAS /parametres/cabinet
    const settings = nav.find(n => n.id === 'settings');
    expect(settings?.subItems?.some(s => s.href === '/parametres/cabinet')).toBe(false);
    expect(settings?.subItems?.some(s => s.name === 'Cabinet')).toBe(false);
  });

  it('construit la navigation paramédicale avec les modules adéquats', () => {
    const config = resolveWorkspace({
      sector: 'health',
      profession: 'physiotherapist',
    });

    const nav = buildProfessionalNavigation(config);
    const navNames = nav.map(n => n.name);

    // Patients est présent exactement une fois
    expect(navNames.filter(n => n === 'Patients')).toHaveLength(1);
    const patientsItem = nav.find(n => n.id === 'patients');
    expect(patientsItem).toBeDefined();
    expect(patientsItem?.href).toBe('/patients');
    expect(patientsItem?.icon).toBe('users');
    expect(patientsItem?.dataTour).toBe('patients-nav');
    
    // Modules exclus
    expect(navNames).not.toContain('Clients');
    expect(navNames).not.toContain('Deals');
    expect(navNames).not.toContain('Marketplace');
    expect(navNames).not.toContain('Messagerie');

    // Modules inclus
    expect(navNames).toContain('Tableau de bord');
    expect(navNames).toContain('Patients');
    expect(navNames).toContain('Facturation');
    expect(navNames).toContain('Agenda');
    expect(navNames).toContain('Paramètres');

    // dataTour settings conservé
    expect(nav.find(n => n.id === 'settings')?.dataTour).toBe('settings-nav');

    // Paramedical settings contient exactement une entrée Cabinet (/parametres/cabinet)
    const settings = nav.find(n => n.id === 'settings');
    const cabinetItems = settings?.subItems?.filter(s => s.href === '/parametres/cabinet' && s.name === 'Cabinet') || [];
    expect(cabinetItems).toHaveLength(1);

    // Produit le label à partir de servicePlural
    const facturation = nav.find(n => n.id === 'billing');
    expect(facturation?.subItems?.map(sub => sub.name)).toContain('Consultations');

    // Agenda subItems paramédical
    const agenda = nav.find(n => n.id === 'agenda');
    expect(agenda?.subItems).toEqual([
      { name: 'Calendrier', href: '/agenda/calendrier' },
      { name: 'Disponibilités', href: '/agenda/disponibilites' },
      { name: 'Types de séances', href: '/agenda/types-seances' },
      { name: 'Tâches', href: '/agenda/taches' },
    ]);
  });

  it('gère le paramédical de base (health sans profession connue)', () => {
    const config = resolveWorkspace({
      sector: 'health',
      profession: null,
    });

    const nav = buildProfessionalNavigation(config);
    
    // Patients est présent
    expect(nav.map(n => n.name)).toContain('Patients');
    
    // Le label par défaut est issu de PARAMEDICAL_TERMINOLOGY de base
    const facturation = nav.find(n => n.id === 'billing');
    expect(facturation?.subItems?.map(sub => sub.name)).toContain('Consultations');
  });
  
  it('ne crée aucune route future automatique à partir des capabilities', () => {
    const config = resolveWorkspace({
      sector: 'health',
      profession: 'osteopath',
    });

    const nav = buildProfessionalNavigation(config);
    
    // Aucune de ces capabilities futures ne devrait avoir généré un menu
    const hrefs = nav.flatMap(n => [n.href, ...(n.subItems?.map(sub => sub.href) || [])]);
    
    expect(hrefs.some(h => h.includes('clinical'))).toBe(false);
    expect(hrefs.some(h => h.includes('encounters'))).toBe(false);
    expect(hrefs.some(h => h.includes('care'))).toBe(false);
  });
  
  it('valide l\'absence de collision d\'IDs sur toutes les professions', () => {
    PARAMEDICAL_PROFESSION_CODES.forEach(code => {
      const config = resolveWorkspace({
        sector: 'health',
        profession: code,
      });
      
      const nav = buildProfessionalNavigation(config);
      const ids = nav.map(n => n.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
