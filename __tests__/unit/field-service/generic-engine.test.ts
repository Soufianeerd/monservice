import { describe, it, expect } from 'vitest';
import { resolveWorkspace } from '../../../src/lib/workspaces/resolver';
import { buildProfessionalNavigation } from '../../../src/lib/navigation/workspace-navigation';
import { FIELD_SERVICE_PROFESSION_CODES } from '../../../src/lib/workspaces/field-service/professions';
import { getFieldServiceProfessionPack } from '../../../src/lib/workspaces/field-service/profession-packs';

describe('Generic Field Service Operations Engine (Session 17)', () => {
  it('resolves all 36 field service professions into valid field_service workspaces with operations capabilities', () => {
    expect(FIELD_SERVICE_PROFESSION_CODES.length).toBe(36);

    for (const professionCode of FIELD_SERVICE_PROFESSION_CODES) {
      const ws = resolveWorkspace({
        sector: 'field_services',
        profession: professionCode,
        country: 'FR',
      });

      expect(ws.type).toBe('field_service');
      expect(ws.capabilities).toContain('workOrders');
      expect(ws.capabilities).toContain('sites');
      expect(ws.capabilities).toContain('assignments');
      expect(ws.capabilities).toContain('workReports');
      expect(ws.terminology.operationSingular).toBeDefined();
      expect(ws.terminology.operationPlural).toBeDefined();
      expect(ws.terminology.siteSingular).toBeDefined();

      const nav = buildProfessionalNavigation(ws);
      const operationsNav = nav.find((item) => item.href === '/operations');
      expect(operationsNav).toBeDefined();
      expect(operationsNav?.name).toBeTruthy();
    }
  });

  it('customizes terminology per profession pack correctly', () => {
    // 1. Plumber (BTP Installation/Repair - family construction_trade)
    const plumberWs = resolveWorkspace({ sector: 'field_services', profession: 'plumber' });
    expect(plumberWs.terminology.operationSingular).toBe('Chantier');
    expect(plumberWs.terminology.operationPlural).toBe('Chantiers');
    expect(plumberWs.terminology.siteSingular).toBe('Chantier');

    // 2. Mason (Gros Oeuvre)
    const masonWs = resolveWorkspace({ sector: 'field_services', profession: 'mason' });
    expect(masonWs.terminology.operationSingular).toBe('Chantier');
    expect(masonWs.terminology.operationPlural).toBe('Chantiers');
    expect(masonWs.terminology.siteSingular).toBe('Chantier');

    // 3. Auto Mechanic (Garage / Atelier)
    const mechanicWs = resolveWorkspace({ sector: 'field_services', profession: 'auto_mechanic' });
    expect(mechanicWs.terminology.operationSingular).toBe('Ordre de réparation');
    expect(mechanicWs.terminology.operationPlural).toBe('Réparations');
    expect(mechanicWs.terminology.siteSingular).toBe('Véhicule / Atelier');

    // 4. Phone Repairer (Dépannage / High-Tech)
    const phoneWs = resolveWorkspace({ sector: 'field_services', profession: 'phone_repairer' });
    expect(phoneWs.terminology.operationSingular).toBe('Prise en charge');
    expect(phoneWs.terminology.operationPlural).toBe('Réparations');
    expect(phoneWs.terminology.siteSingular).toBe('Point de dépôt');

    // 5. Architect (Études & Conception)
    const archWs = resolveWorkspace({ sector: 'field_services', profession: 'architect' });
    expect(archWs.terminology.operationSingular).toBe('Mission');
    expect(archWs.terminology.operationPlural).toBe('Missions');
    expect(archWs.terminology.siteSingular).toBe('Site du projet');

    // 6. Landscaper (Paysage & Espaces Verts)
    const landWs = resolveWorkspace({ sector: 'field_services', profession: 'landscaper' });
    expect(landWs.terminology.operationSingular).toBe('Chantier');
    expect(landWs.terminology.operationPlural).toBe('Chantiers');
    expect(landWs.terminology.siteSingular).toBe('Terrain / Propriété');
  });

  it('constructs rich dashboard quick actions and headers per profession', () => {
    const pack = getFieldServiceProfessionPack('electrician');
    expect(pack).toBeDefined();
    expect(pack?.dashboard?.headerTitle).toBe('Espace Électricité & Domotique');
    expect(pack?.dashboard?.quickActionNote).toContain('dépannages électriques');

    const masonPack = getFieldServiceProfessionPack('mason');
    expect(masonPack).toBeDefined();
    expect(masonPack?.dashboard?.headerTitle).toBe('Espace Maçonnerie & Gros Œuvre');
    expect(masonPack?.dashboard?.quickActionNote).toContain('gros œuvre');
  });
});
