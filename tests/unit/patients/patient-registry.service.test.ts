import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patientRegistryService } from '@/lib/services/patient-registry.service';

let mockSelectRows: Array<Record<string, unknown>> = [];
let mockReturningRows: Array<Record<string, unknown>> = [];

vi.mock('@/lib/db/server', () => {
  const queryBuilder = {
    from: () => queryBuilder,
    where: () => Promise.resolve(mockSelectRows),
    orderBy: () => queryBuilder,
    limit: () => Promise.resolve(mockSelectRows),
    offset: () => Promise.resolve(mockSelectRows),
    innerJoin: () => queryBuilder,
  };

  const txBuilder = {
    select: () => queryBuilder,
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve(mockReturningRows),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => {
          const retObj = {
            returning: () => Promise.resolve(mockReturningRows),
          };
          return Object.assign(Promise.resolve(mockReturningRows), retObj);
        },
      }),
    }),
  };

  return {
    db: {
      select: () => queryBuilder,
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve(mockReturningRows),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve(mockReturningRows),
          }),
        }),
      }),
      transaction: (cb: (tx: typeof txBuilder) => Promise<unknown>) => cb(txBuilder),
    },
  };
});

describe('Patient Registry Service - Active Endpoint Invariants', () => {
  const orgId = 'org-test-123';
  const patientId = 'patient-123';
  const representativeId = 'rep-123';
  const linkId = 'link-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectRows = [];
    mockReturningRows = [];
  });

  describe('linkRepresentative', () => {
    it('rejects linking when patient is archived (isActive = false)', async () => {
      vi.spyOn(patientRegistryService, 'getPatientById').mockResolvedValue({
        id: patientId,
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-05-15',
        sex: 'female',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: false, // ARCHIVED
      });

      await expect(
        patientRegistryService.linkRepresentative(orgId, patientId, representativeId, {
          relationship: 'parent',
          isLegalRepresentative: true,
          isPrimaryContact: true,
          isEmergencyContact: false,
          isBillingContact: false,
        })
      ).rejects.toThrow('Patient introuvable ou inactif dans cette organisation');
    });

    it('rejects linking when representative is archived (isActive = false)', async () => {
      vi.spyOn(patientRegistryService, 'getPatientById').mockResolvedValue({
        id: patientId,
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-05-15',
        sex: 'female',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: true, // ACTIVE
      });

      mockSelectRows = [
        {
          id: representativeId,
          isActive: false, // ARCHIVED
        },
      ];

      await expect(
        patientRegistryService.linkRepresentative(orgId, patientId, representativeId, {
          relationship: 'parent',
          isLegalRepresentative: true,
          isPrimaryContact: true,
          isEmergencyContact: false,
          isBillingContact: false,
        })
      ).rejects.toThrow('Représentant introuvable ou inactif dans cette organisation');
    });
  });

  describe('createRepresentativeAndLink', () => {
    it('rejects creating and linking representative when target patient is archived', async () => {
      vi.spyOn(patientRegistryService, 'getPatientById').mockResolvedValue({
        id: patientId,
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-05-15',
        sex: 'female',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: false, // ARCHIVED
      });

      await expect(
        patientRegistryService.createRepresentativeAndLink(
          orgId,
          patientId,
          {
            firstName: 'Pierre',
            lastName: 'DUPONT',
            email: null,
            phone: null,
            address: null,
            city: null,
            postalCode: null,
            country: null,
          },
          {
            relationship: 'parent',
            isLegalRepresentative: true,
            isPrimaryContact: false,
            isEmergencyContact: false,
            isBillingContact: false,
          }
        )
      ).rejects.toThrow('Patient introuvable ou inactif dans cette organisation');
    });
  });

  describe('setRepresentativeLinkActive', () => {
    it('allows archiving a link without checking active endpoints', async () => {
      mockSelectRows = [
        {
          id: linkId,
          patientId,
          representativeId,
          isPrimaryContact: false,
          isActive: true,
        },
      ];

      mockReturningRows = [
        {
          id: linkId,
          patientId,
          representativeId,
          relationship: 'parent',
          isLegalRepresentative: true,
          isPrimaryContact: false,
          isEmergencyContact: false,
          isBillingContact: false,
          isActive: false,
        },
      ];

      const res = await patientRegistryService.setRepresentativeLinkActive(orgId, linkId, false);
      expect(res.isActive).toBe(false);
    });

    it('rejects link reactivation if target patient is archived', async () => {
      mockSelectRows = [
        {
          id: linkId,
          patientId,
          representativeId,
          isPrimaryContact: false,
          isActive: false,
        },
      ];

      vi.spyOn(patientRegistryService, 'getPatientById').mockResolvedValueOnce({
        id: patientId,
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-05-15',
        sex: 'female',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: false, // ARCHIVED
      });

      await expect(
        patientRegistryService.setRepresentativeLinkActive(orgId, linkId, true)
      ).rejects.toThrow('Impossible de réactiver un lien pour un patient archivé ou introuvable');
    });

    it('rejects link reactivation if target representative is archived', async () => {
      // 1. Initial link select returns link
      mockSelectRows = [
        {
          id: linkId,
          patientId,
          representativeId,
          isPrimaryContact: false,
          isActive: false,
        },
      ];

      // 2. Patient is active
      vi.spyOn(patientRegistryService, 'getPatientById').mockResolvedValueOnce({
        id: patientId,
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-05-15',
        sex: 'female',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: true, // ACTIVE
      });

      // 3. Next select query for representative returns archived rep
      // Once getPatientById resolves, mockSelectRows is queried for representative
      mockSelectRows = [
        {
          id: representativeId,
          isActive: false, // ARCHIVED
        },
      ];

      await expect(
        patientRegistryService.setRepresentativeLinkActive(orgId, linkId, true)
      ).rejects.toThrow('Impossible de réactiver un lien pour un représentant archivé ou introuvable');
    });

    it('allows link reactivation when both patient and representative are active', async () => {
      // 1. Link is inactive
      mockSelectRows = [
        {
          id: linkId,
          patientId,
          representativeId,
          isPrimaryContact: false,
          isActive: false,
        },
      ];

      // 2. Patient is active
      vi.spyOn(patientRegistryService, 'getPatientById').mockResolvedValueOnce({
        id: patientId,
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-05-15',
        sex: 'female',
        birthPlace: null,
        birthPlaceCode: null,
        birthCountry: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        isActive: true, // ACTIVE
      });

      // 3. Representative is active
      mockSelectRows = [
        {
          id: representativeId,
          isActive: true, // ACTIVE
        },
      ];

      // 4. Returning row
      mockReturningRows = [
        {
          id: linkId,
          patientId,
          representativeId,
          relationship: 'parent',
          isLegalRepresentative: true,
          isPrimaryContact: false,
          isEmergencyContact: false,
          isBillingContact: false,
          isActive: true,
        },
      ];

      const res = await patientRegistryService.setRepresentativeLinkActive(orgId, linkId, true);
      expect(res.isActive).toBe(true);
    });
  });
});
