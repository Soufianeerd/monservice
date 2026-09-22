import { describe, expect, it } from 'vitest';
import {
  FIELD_SERVICE_BUSINESS_FAMILIES,
  FIELD_SERVICE_BUSINESS_FAMILY_CODES,
  isFieldServiceBusinessFamilyCode,
} from '../../../src/lib/workspaces/field-service/families';
import {
  FIELD_SERVICE_PROFESSIONS,
  FIELD_SERVICE_PROFESSION_CODES,
  isFieldServiceProfessionCode,
} from '../../../src/lib/workspaces/field-service/professions';
import {
  FIELD_SERVICE_PROFESSION_PACKS,
  getFieldServiceProfessionPack,
} from '../../../src/lib/workspaces/field-service/profession-packs';
import {
  FIELD_SERVICE_IMPLEMENTED_CAPABILITIES,
  FIELD_SERVICE_PLANNED_CAPABILITIES,
} from '../../../src/lib/workspaces/field-service/capabilities';
import {
  DEFAULT_FIELD_SERVICE_TERMINOLOGY,
  FAMILY_DEFAULT_TERMINOLOGY,
} from '../../../src/lib/workspaces/field-service/terminology';
import {
  getFieldServiceWorkspaceConfig,
} from '../../../src/lib/workspaces/field-service/config';
import { resolveWorkspace } from '../../../src/lib/workspaces/resolver';
import { buildProfessionalNavigation } from '../../../src/lib/navigation/workspace-navigation';

describe('Field Service Business Families Registry', () => {
  it('should have exactly 9 canonical business families', () => {
    expect(FIELD_SERVICE_BUSINESS_FAMILY_CODES.length).toBe(9);
    expect(Object.keys(FIELD_SERVICE_BUSINESS_FAMILIES).length).toBe(9);
  });

  it('should not contain duplicate family codes', () => {
    const uniqueCodes = new Set(FIELD_SERVICE_BUSINESS_FAMILY_CODES);
    expect(uniqueCodes.size).toBe(9);
  });

  it('family keys should match code property', () => {
    for (const code of FIELD_SERVICE_BUSINESS_FAMILY_CODES) {
      expect(FIELD_SERVICE_BUSINESS_FAMILIES[code].code).toBe(code);
      expect(FIELD_SERVICE_BUSINESS_FAMILIES[code].label).toBeTruthy();
    }
  });

  it('type guard isFieldServiceBusinessFamilyCode should validate correctly', () => {
    FIELD_SERVICE_BUSINESS_FAMILY_CODES.forEach((code) => {
      expect(isFieldServiceBusinessFamilyCode(code)).toBe(true);
    });
    expect(isFieldServiceBusinessFamilyCode('invalid_family')).toBe(false);
    expect(isFieldServiceBusinessFamilyCode('')).toBe(false);
    expect(isFieldServiceBusinessFamilyCode(null)).toBe(false);
  });
});

describe('Field Service Professions Registry', () => {
  it('should have exactly 36 canonical professions', () => {
    expect(FIELD_SERVICE_PROFESSION_CODES.length).toBe(36);
    expect(Object.keys(FIELD_SERVICE_PROFESSIONS).length).toBe(36);
  });

  it('should not contain duplicate profession codes', () => {
    const uniqueCodes = new Set(FIELD_SERVICE_PROFESSION_CODES);
    expect(uniqueCodes.size).toBe(36);
  });

  it('each profession should reference a valid business family', () => {
    for (const code of FIELD_SERVICE_PROFESSION_CODES) {
      const profession = FIELD_SERVICE_PROFESSIONS[code];
      expect(profession.code).toBe(code);
      expect(isFieldServiceBusinessFamilyCode(profession.family)).toBe(true);
      expect(profession.label).toBeTruthy();
    }
  });

  it('type guard isFieldServiceProfessionCode should validate correctly', () => {
    FIELD_SERVICE_PROFESSION_CODES.forEach((code) => {
      expect(isFieldServiceProfessionCode(code)).toBe(true);
    });
    expect(isFieldServiceProfessionCode('unknown')).toBe(false);
    expect(isFieldServiceProfessionCode('physiotherapist')).toBe(false); // health profession
    expect(isFieldServiceProfessionCode(null)).toBe(false);
  });
});

describe('Field Service Profession Packs', () => {
  it('should have a profession pack for all 36 professions', () => {
    expect(Object.keys(FIELD_SERVICE_PROFESSION_PACKS).length).toBe(36);
    for (const code of FIELD_SERVICE_PROFESSION_CODES) {
      const pack = FIELD_SERVICE_PROFESSION_PACKS[code];
      expect(pack).toBeDefined();
      expect(pack.profession).toBe(code);
      expect(pack.family).toBe(FIELD_SERVICE_PROFESSIONS[code].family);
      expect(pack.workflowProfile).toBeDefined();
      expect(pack.customerAssetModel).toBeDefined();
      expect(pack.terminology).toBeDefined();
    }
  });

  it('getFieldServiceProfessionPack should return undefined for invalid code', () => {
    expect(getFieldServiceProfessionPack('invalid')).toBeUndefined();
    expect(getFieldServiceProfessionPack(null)).toBeUndefined();
    expect(getFieldServiceProfessionPack(undefined)).toBeUndefined();
  });
});

describe('Field Service Capabilities', () => {
  it('should separate implemented capabilities from planned ones', () => {
    expect(FIELD_SERVICE_IMPLEMENTED_CAPABILITIES.length).toBeGreaterThan(0);
    expect(FIELD_SERVICE_PLANNED_CAPABILITIES.length).toBeGreaterThan(0);

    const implementedSet = new Set<string>(FIELD_SERVICE_IMPLEMENTED_CAPABILITIES);
    for (const planned of FIELD_SERVICE_PLANNED_CAPABILITIES) {
      expect(implementedSet.has(planned)).toBe(false);
    }
  });
});

describe('Field Service Terminology', () => {
  it('should provide default terminology', () => {
    expect(DEFAULT_FIELD_SERVICE_TERMINOLOGY.customerPlural).toBe('Clients');
    expect(DEFAULT_FIELD_SERVICE_TERMINOLOGY.quoteLabel).toBe('Devis');
  });

  it('should specialize terminology by family for automotive', () => {
    const terminology = FAMILY_DEFAULT_TERMINOLOGY.automotive;
    expect(terminology.workSingular).toBe('Ordre de réparation');
    expect(terminology.invoiceLabel).toBe('Facture garage');
  });

  it('should specialize terminology by family for device_repair', () => {
    const terminology = FAMILY_DEFAULT_TERMINOLOGY.device_repair;
    expect(terminology.workSingular).toBe('Dossier réparation');
  });

  it('should specialize terminology by family for construction_trade', () => {
    const terminology = FAMILY_DEFAULT_TERMINOLOGY.construction_trade;
    expect(terminology.workSingular).toBe('Chantier');
    expect(terminology.serviceSingular).toBe('Ouvrage');
  });
});

describe('Field Service Workspace Config & Resolver', () => {
  it('should return default field service config when profession is undefined or unknown', () => {
    const defaultConfig = getFieldServiceWorkspaceConfig();
    expect(defaultConfig.type).toBe('field_service');
    expect(defaultConfig.profession).toBeUndefined();
    expect(defaultConfig.label).toBe('Espace BTP & Services Techniques');

    const unknownConfig = getFieldServiceWorkspaceConfig('invalid_code');
    expect(unknownConfig.type).toBe('field_service');
    expect(unknownConfig.profession).toBeUndefined();
  });

  it('should resolve workspace config for all 36 professions', () => {
    for (const code of FIELD_SERVICE_PROFESSION_CODES) {
      const config = resolveWorkspace({ sector: 'field_services', profession: code });
      expect(config.type).toBe('field_service');
      if (config.type === 'field_service') {
        expect(config.profession).toBe(code);
        expect(config.label).toBe(FIELD_SERVICE_PROFESSIONS[code].label);
        expect(config.businessFamily).toBe(FIELD_SERVICE_PROFESSIONS[code].family);
      }
    }
  });
});

describe('Field Service Navigation (Zero Fake Routes)', () => {
  it('should return valid active routes and NO unbuilt fake routes', () => {
    const config = getFieldServiceWorkspaceConfig('plumber');
    const navItems = buildProfessionalNavigation(config);

    const hrefs = navItems.map((item) => item.href);

    // Should include standard active routes
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/clients');
    expect(hrefs).toContain('/deals');
    expect(hrefs).toContain('/facturation');
    expect(hrefs).toContain('/agenda');
    expect(hrefs).toContain('/messages');
    expect(hrefs).toContain('/parametres');

    // MUST NOT contain unbuilt fake routes
    expect(hrefs).not.toContain('/chantiers');
    expect(hrefs).not.toContain('/interventions');
    expect(hrefs).not.toContain('/stock');
    expect(hrefs).not.toContain('/equipements');
    expect(hrefs).not.toContain('/vehicules');
    expect(hrefs).not.toContain('/tournees');
  });
});
