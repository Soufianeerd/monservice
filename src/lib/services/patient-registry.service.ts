import { db } from '@/lib/db/server';
import { patientProfiles, patientRepresentatives, patientRepresentativeLinks } from '@/lib/db/schema';
import { eq, and, sql, asc, ilike, or, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import {
  PatientProfileDTO,
  PatientRepresentativeDTO,
  PatientRepresentativeLinkDTO,
  PatientRepresentativeWithLinkDTO,
  PatientDetailDTO,
  PatientListFilters,
  PatientListResult,
  PatientSexCode,
  PatientRelationshipCode,
} from '@/lib/patients/types';
import {
  PatientCreateInput,
  PatientUpdateInput,
  PatientRepresentativeCreateInput,
  PatientRepresentativeUpdateInput,
  PatientRepresentativeLinkCreateInput,
  PatientRepresentativeLinkUpdateInput,
} from '@/lib/patients/validation';

export const patientRegistryService = {
  /**
   * Liste paginée des patients avec filtres au niveau PostgreSQL
   */
  async listPatients(organizationId: string, filters: PatientListFilters = {}): Promise<PatientListResult> {
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = Math.max(filters.offset ?? 0, 0);

    const conditions = [eq(patientProfiles.organizationId, organizationId)];

    if (filters.active === 'active') {
      conditions.push(eq(patientProfiles.isActive, true));
    } else if (filters.active === 'archived') {
      conditions.push(eq(patientProfiles.isActive, false));
    }

    if (filters.birthName) {
      const pattern = `%${filters.birthName.trim()}%`;
      conditions.push(
        or(
          ilike(patientProfiles.birthName, pattern),
          ilike(patientProfiles.usedName, pattern)
        )!
      );
    }

    if (filters.firstName) {
      const pattern = `%${filters.firstName.trim()}%`;
      conditions.push(
        or(
          ilike(patientProfiles.firstBirthName, pattern),
          ilike(patientProfiles.usedFirstName, pattern),
          ilike(patientProfiles.birthFirstNames, pattern)
        )!
      );
    }

    if (filters.birthDate) {
      conditions.push(eq(patientProfiles.birthDate, filters.birthDate.trim()));
    }

    const whereClause = and(...conditions);

    // Total count query
    const [totalCountResult] = await db
      .select({ total: count() })
      .from(patientProfiles)
      .where(whereClause);

    const total = totalCountResult?.total ?? 0;

    // Projected rows query
    const rawRows = await db
      .select({
        id: patientProfiles.id,
        birthName: patientProfiles.birthName,
        firstBirthName: patientProfiles.firstBirthName,
        birthFirstNames: patientProfiles.birthFirstNames,
        usedName: patientProfiles.usedName,
        usedFirstName: patientProfiles.usedFirstName,
        birthDate: patientProfiles.birthDate,
        sex: patientProfiles.sex,
        birthPlace: patientProfiles.birthPlace,
        birthPlaceCode: patientProfiles.birthPlaceCode,
        birthCountry: patientProfiles.birthCountry,
        email: patientProfiles.email,
        phone: patientProfiles.phone,
        address: patientProfiles.address,
        city: patientProfiles.city,
        postalCode: patientProfiles.postalCode,
        country: patientProfiles.country,
        isActive: patientProfiles.isActive,
      })
      .from(patientProfiles)
      .where(whereClause)
      .orderBy(
        asc(patientProfiles.birthName),
        asc(patientProfiles.firstBirthName),
        asc(patientProfiles.id)
      )
      .limit(limit)
      .offset(offset);

    const rows: PatientProfileDTO[] = rawRows.map((r) => ({
      ...r,
      sex: r.sex as PatientSexCode,
    }));

    return {
      rows,
      total,
      limit,
      offset,
    };
  },

  /**
   * Récupère un profil patient par ID
   */
  async getPatientById(organizationId: string, patientId: string): Promise<PatientProfileDTO | null> {
    const [raw] = await db
      .select({
        id: patientProfiles.id,
        birthName: patientProfiles.birthName,
        firstBirthName: patientProfiles.firstBirthName,
        birthFirstNames: patientProfiles.birthFirstNames,
        usedName: patientProfiles.usedName,
        usedFirstName: patientProfiles.usedFirstName,
        birthDate: patientProfiles.birthDate,
        sex: patientProfiles.sex,
        birthPlace: patientProfiles.birthPlace,
        birthPlaceCode: patientProfiles.birthPlaceCode,
        birthCountry: patientProfiles.birthCountry,
        email: patientProfiles.email,
        phone: patientProfiles.phone,
        address: patientProfiles.address,
        city: patientProfiles.city,
        postalCode: patientProfiles.postalCode,
        country: patientProfiles.country,
        isActive: patientProfiles.isActive,
      })
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      );

    if (!raw) return null;

    return {
      ...raw,
      sex: raw.sex as PatientSexCode,
    };
  },

  /**
   * Récupère le détail complet d'un patient avec ses représentants et rôles
   */
  async getPatientDetail(organizationId: string, patientId: string): Promise<PatientDetailDTO | null> {
    const patient = await this.getPatientById(organizationId, patientId);
    if (!patient) return null;

    const rawLinks = await db
      .select({
        linkId: patientRepresentativeLinks.id,
        representativeId: patientRepresentatives.id,
        firstName: patientRepresentatives.firstName,
        lastName: patientRepresentatives.lastName,
        email: patientRepresentatives.email,
        phone: patientRepresentatives.phone,
        address: patientRepresentatives.address,
        city: patientRepresentatives.city,
        postalCode: patientRepresentatives.postalCode,
        country: patientRepresentatives.country,
        relationship: patientRepresentativeLinks.relationship,
        isLegalRepresentative: patientRepresentativeLinks.isLegalRepresentative,
        isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
        isEmergencyContact: patientRepresentativeLinks.isEmergencyContact,
        isBillingContact: patientRepresentativeLinks.isBillingContact,
        isLinkActive: patientRepresentativeLinks.isActive,
        isRepresentativeActive: patientRepresentatives.isActive,
      })
      .from(patientRepresentativeLinks)
      .innerJoin(
        patientRepresentatives,
        and(
          eq(patientRepresentativeLinks.representativeId, patientRepresentatives.id),
          eq(patientRepresentativeLinks.organizationId, patientRepresentatives.organizationId)
        )
      )
      .where(
        and(
          eq(patientRepresentativeLinks.organizationId, organizationId),
          eq(patientRepresentativeLinks.patientId, patientId)
        )
      )
      .orderBy(
        asc(patientRepresentativeLinks.isPrimaryContact),
        asc(patientRepresentatives.lastName),
        asc(patientRepresentatives.firstName)
      );

    const representatives: PatientRepresentativeWithLinkDTO[] = rawLinks.map((l) => ({
      ...l,
      relationship: l.relationship as PatientRelationshipCode,
    }));

    return {
      patient,
      representatives,
    };
  },

  /**
   * Création d'un profil patient
   */
  async createPatient(organizationId: string, input: PatientCreateInput): Promise<PatientProfileDTO> {
    const id = randomUUID();

    const [inserted] = await db
      .insert(patientProfiles)
      .values({
        id,
        organizationId,
        birthName: input.birthName,
        firstBirthName: input.firstBirthName,
        birthFirstNames: input.birthFirstNames,
        usedName: input.usedName,
        usedFirstName: input.usedFirstName,
        birthDate: input.birthDate,
        sex: input.sex,
        birthPlace: input.birthPlace,
        birthPlaceCode: input.birthPlaceCode,
        birthCountry: input.birthCountry,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country,
        isActive: true,
      })
      .returning({
        id: patientProfiles.id,
        birthName: patientProfiles.birthName,
        firstBirthName: patientProfiles.firstBirthName,
        birthFirstNames: patientProfiles.birthFirstNames,
        usedName: patientProfiles.usedName,
        usedFirstName: patientProfiles.usedFirstName,
        birthDate: patientProfiles.birthDate,
        sex: patientProfiles.sex,
        birthPlace: patientProfiles.birthPlace,
        birthPlaceCode: patientProfiles.birthPlaceCode,
        birthCountry: patientProfiles.birthCountry,
        email: patientProfiles.email,
        phone: patientProfiles.phone,
        address: patientProfiles.address,
        city: patientProfiles.city,
        postalCode: patientProfiles.postalCode,
        country: patientProfiles.country,
        isActive: patientProfiles.isActive,
      });

    return {
      ...inserted,
      sex: inserted.sex as PatientSexCode,
    };
  },

  /**
   * Mise à jour d'un profil patient
   */
  async updatePatient(
    organizationId: string,
    patientId: string,
    input: PatientUpdateInput
  ): Promise<PatientProfileDTO> {
    const existing = await this.getPatientById(organizationId, patientId);
    if (!existing) {
      throw new Error('Patient introuvable dans cette organisation');
    }

    const [updated] = await db
      .update(patientProfiles)
      .set({
        ...input,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(patientProfiles.id, patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      )
      .returning({
        id: patientProfiles.id,
        birthName: patientProfiles.birthName,
        firstBirthName: patientProfiles.firstBirthName,
        birthFirstNames: patientProfiles.birthFirstNames,
        usedName: patientProfiles.usedName,
        usedFirstName: patientProfiles.usedFirstName,
        birthDate: patientProfiles.birthDate,
        sex: patientProfiles.sex,
        birthPlace: patientProfiles.birthPlace,
        birthPlaceCode: patientProfiles.birthPlaceCode,
        birthCountry: patientProfiles.birthCountry,
        email: patientProfiles.email,
        phone: patientProfiles.phone,
        address: patientProfiles.address,
        city: patientProfiles.city,
        postalCode: patientProfiles.postalCode,
        country: patientProfiles.country,
        isActive: patientProfiles.isActive,
      });

    return {
      ...updated,
      sex: updated.sex as PatientSexCode,
    };
  },

  /**
   * Activation / Archivage logique d'un patient
   */
  async setPatientActive(organizationId: string, patientId: string, isActive: boolean): Promise<PatientProfileDTO> {
    const existing = await this.getPatientById(organizationId, patientId);
    if (!existing) {
      throw new Error('Patient introuvable dans cette organisation');
    }

    const [updated] = await db
      .update(patientProfiles)
      .set({
        isActive,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(patientProfiles.id, patientId),
          eq(patientProfiles.organizationId, organizationId)
        )
      )
      .returning({
        id: patientProfiles.id,
        birthName: patientProfiles.birthName,
        firstBirthName: patientProfiles.firstBirthName,
        birthFirstNames: patientProfiles.birthFirstNames,
        usedName: patientProfiles.usedName,
        usedFirstName: patientProfiles.usedFirstName,
        birthDate: patientProfiles.birthDate,
        sex: patientProfiles.sex,
        birthPlace: patientProfiles.birthPlace,
        birthPlaceCode: patientProfiles.birthPlaceCode,
        birthCountry: patientProfiles.birthCountry,
        email: patientProfiles.email,
        phone: patientProfiles.phone,
        address: patientProfiles.address,
        city: patientProfiles.city,
        postalCode: patientProfiles.postalCode,
        country: patientProfiles.country,
        isActive: patientProfiles.isActive,
      });

    return {
      ...updated,
      sex: updated.sex as PatientSexCode,
    };
  },

  /**
   * Liste des représentants d'une organisation
   */
  async listRepresentatives(organizationId: string): Promise<PatientRepresentativeDTO[]> {
    return db
      .select({
        id: patientRepresentatives.id,
        firstName: patientRepresentatives.firstName,
        lastName: patientRepresentatives.lastName,
        email: patientRepresentatives.email,
        phone: patientRepresentatives.phone,
        address: patientRepresentatives.address,
        city: patientRepresentatives.city,
        postalCode: patientRepresentatives.postalCode,
        country: patientRepresentatives.country,
        isActive: patientRepresentatives.isActive,
      })
      .from(patientRepresentatives)
      .where(eq(patientRepresentatives.organizationId, organizationId))
      .orderBy(asc(patientRepresentatives.lastName), asc(patientRepresentatives.firstName));
  },

  /**
   * Création d'un représentant réutilisable
   */
  async createRepresentative(
    organizationId: string,
    input: PatientRepresentativeCreateInput
  ): Promise<PatientRepresentativeDTO> {
    const id = randomUUID();

    const [inserted] = await db
      .insert(patientRepresentatives)
      .values({
        id,
        organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country,
        isActive: true,
      })
      .returning({
        id: patientRepresentatives.id,
        firstName: patientRepresentatives.firstName,
        lastName: patientRepresentatives.lastName,
        email: patientRepresentatives.email,
        phone: patientRepresentatives.phone,
        address: patientRepresentatives.address,
        city: patientRepresentatives.city,
        postalCode: patientRepresentatives.postalCode,
        country: patientRepresentatives.country,
        isActive: patientRepresentatives.isActive,
      });

    return inserted;
  },

  /**
   * Mise à jour des coordonnées d'un représentant
   */
  async updateRepresentative(
    organizationId: string,
    representativeId: string,
    input: PatientRepresentativeUpdateInput
  ): Promise<PatientRepresentativeDTO> {
    const [existing] = await db
      .select({ id: patientRepresentatives.id })
      .from(patientRepresentatives)
      .where(
        and(
          eq(patientRepresentatives.id, representativeId),
          eq(patientRepresentatives.organizationId, organizationId)
        )
      );

    if (!existing) {
      throw new Error('Représentant introuvable dans cette organisation');
    }

    const [updated] = await db
      .update(patientRepresentatives)
      .set({
        ...input,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(patientRepresentatives.id, representativeId),
          eq(patientRepresentatives.organizationId, organizationId)
        )
      )
      .returning({
        id: patientRepresentatives.id,
        firstName: patientRepresentatives.firstName,
        lastName: patientRepresentatives.lastName,
        email: patientRepresentatives.email,
        phone: patientRepresentatives.phone,
        address: patientRepresentatives.address,
        city: patientRepresentatives.city,
        postalCode: patientRepresentatives.postalCode,
        country: patientRepresentatives.country,
        isActive: patientRepresentatives.isActive,
      });

    return updated;
  },

  /**
   * Lie un représentant existant à un patient (gestion transactionnelle du primary contact)
   */
  async linkRepresentative(
    organizationId: string,
    patientId: string,
    representativeId: string,
    linkInput: PatientRepresentativeLinkCreateInput
  ): Promise<PatientRepresentativeLinkDTO> {
    // 1. Validation de l'appartenance au tenant et statut actif du patient
    const patient = await this.getPatientById(organizationId, patientId);
    if (!patient || !patient.isActive) {
      throw new Error('Patient introuvable ou inactif dans cette organisation');
    }

    // 2. Validation de l'appartenance au tenant et statut actif du représentant
    const [representative] = await db
      .select({ 
        id: patientRepresentatives.id, 
        isActive: patientRepresentatives.isActive 
      })
      .from(patientRepresentatives)
      .where(
        and(
          eq(patientRepresentatives.id, representativeId),
          eq(patientRepresentatives.organizationId, organizationId)
        )
      );

    if (!representative || !representative.isActive) {
      throw new Error('Représentant introuvable ou inactif dans cette organisation');
    }

    return db.transaction(async (tx) => {
      // Si ce lien doit être contact principal, réinitialiser le flag sur les autres liens actifs du patient
      if (linkInput.isPrimaryContact) {
        await tx
          .update(patientRepresentativeLinks)
          .set({ isPrimaryContact: false, updatedAt: sql`now()` })
          .where(
            and(
              eq(patientRepresentativeLinks.organizationId, organizationId),
              eq(patientRepresentativeLinks.patientId, patientId),
              eq(patientRepresentativeLinks.isActive, true)
            )
          );
      }

      // Vérifier si un lien existe déjà (actif ou inactif)
      const [existingLink] = await tx
        .select({ id: patientRepresentativeLinks.id })
        .from(patientRepresentativeLinks)
        .where(
          and(
            eq(patientRepresentativeLinks.organizationId, organizationId),
            eq(patientRepresentativeLinks.patientId, patientId),
            eq(patientRepresentativeLinks.representativeId, representativeId)
          )
        );

      if (existingLink) {
        const [updated] = await tx
          .update(patientRepresentativeLinks)
          .set({
            relationship: linkInput.relationship,
            isLegalRepresentative: linkInput.isLegalRepresentative,
            isPrimaryContact: linkInput.isPrimaryContact,
            isEmergencyContact: linkInput.isEmergencyContact,
            isBillingContact: linkInput.isBillingContact,
            isActive: true,
            updatedAt: sql`now()`,
          })
          .where(eq(patientRepresentativeLinks.id, existingLink.id))
          .returning({
            id: patientRepresentativeLinks.id,
            patientId: patientRepresentativeLinks.patientId,
            representativeId: patientRepresentativeLinks.representativeId,
            relationship: patientRepresentativeLinks.relationship,
            isLegalRepresentative: patientRepresentativeLinks.isLegalRepresentative,
            isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
            isEmergencyContact: patientRepresentativeLinks.isEmergencyContact,
            isBillingContact: patientRepresentativeLinks.isBillingContact,
            isActive: patientRepresentativeLinks.isActive,
          });

        return {
          ...updated,
          relationship: updated.relationship as PatientRelationshipCode,
        };
      }

      const linkId = randomUUID();
      const [created] = await tx
        .insert(patientRepresentativeLinks)
        .values({
          id: linkId,
          organizationId,
          patientId,
          representativeId,
          relationship: linkInput.relationship,
          isLegalRepresentative: linkInput.isLegalRepresentative,
          isPrimaryContact: linkInput.isPrimaryContact,
          isEmergencyContact: linkInput.isEmergencyContact,
          isBillingContact: linkInput.isBillingContact,
          isActive: true,
        })
        .returning({
          id: patientRepresentativeLinks.id,
          patientId: patientRepresentativeLinks.patientId,
          representativeId: patientRepresentativeLinks.representativeId,
          relationship: patientRepresentativeLinks.relationship,
          isLegalRepresentative: patientRepresentativeLinks.isLegalRepresentative,
          isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
          isEmergencyContact: patientRepresentativeLinks.isEmergencyContact,
          isBillingContact: patientRepresentativeLinks.isBillingContact,
          isActive: patientRepresentativeLinks.isActive,
        });

      return {
        ...created,
        relationship: created.relationship as PatientRelationshipCode,
      };
    });
  },

  /**
   * Crée un nouveau représentant et le lie au patient dans une transaction unique
   */
  async createRepresentativeAndLink(
    organizationId: string,
    patientId: string,
    representativeInput: PatientRepresentativeCreateInput,
    linkInput: PatientRepresentativeLinkCreateInput
  ): Promise<{ representative: PatientRepresentativeDTO; link: PatientRepresentativeLinkDTO }> {
    const patient = await this.getPatientById(organizationId, patientId);
    if (!patient || !patient.isActive) {
      throw new Error('Patient introuvable ou inactif dans cette organisation');
    }

    return db.transaction(async (tx) => {
      const repId = randomUUID();
      const [representative] = await tx
        .insert(patientRepresentatives)
        .values({
          id: repId,
          organizationId,
          firstName: representativeInput.firstName,
          lastName: representativeInput.lastName,
          email: representativeInput.email,
          phone: representativeInput.phone,
          address: representativeInput.address,
          city: representativeInput.city,
          postalCode: representativeInput.postalCode,
          country: representativeInput.country,
          isActive: true,
        })
        .returning({
          id: patientRepresentatives.id,
          firstName: patientRepresentatives.firstName,
          lastName: patientRepresentatives.lastName,
          email: patientRepresentatives.email,
          phone: patientRepresentatives.phone,
          address: patientRepresentatives.address,
          city: patientRepresentatives.city,
          postalCode: patientRepresentatives.postalCode,
          country: patientRepresentatives.country,
          isActive: patientRepresentatives.isActive,
        });

      if (linkInput.isPrimaryContact) {
        await tx
          .update(patientRepresentativeLinks)
          .set({ isPrimaryContact: false, updatedAt: sql`now()` })
          .where(
            and(
              eq(patientRepresentativeLinks.organizationId, organizationId),
              eq(patientRepresentativeLinks.patientId, patientId),
              eq(patientRepresentativeLinks.isActive, true)
            )
          );
      }

      const linkId = randomUUID();
      const [link] = await tx
        .insert(patientRepresentativeLinks)
        .values({
          id: linkId,
          organizationId,
          patientId,
          representativeId: repId,
          relationship: linkInput.relationship,
          isLegalRepresentative: linkInput.isLegalRepresentative,
          isPrimaryContact: linkInput.isPrimaryContact,
          isEmergencyContact: linkInput.isEmergencyContact,
          isBillingContact: linkInput.isBillingContact,
          isActive: true,
        })
        .returning({
          id: patientRepresentativeLinks.id,
          patientId: patientRepresentativeLinks.patientId,
          representativeId: patientRepresentativeLinks.representativeId,
          relationship: patientRepresentativeLinks.relationship,
          isLegalRepresentative: patientRepresentativeLinks.isLegalRepresentative,
          isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
          isEmergencyContact: patientRepresentativeLinks.isEmergencyContact,
          isBillingContact: patientRepresentativeLinks.isBillingContact,
          isActive: patientRepresentativeLinks.isActive,
        });

      return {
        representative,
        link: {
          ...link,
          relationship: link.relationship as PatientRelationshipCode,
        },
      };
    });
  },

  /**
   * Met à jour les métadonnées d'un lien (relation, flags légal, principal, etc.)
   */
  async updateRepresentativeLink(
    organizationId: string,
    linkId: string,
    input: PatientRepresentativeLinkUpdateInput
  ): Promise<PatientRepresentativeLinkDTO> {
    const [existing] = await db
      .select({
        id: patientRepresentativeLinks.id,
        patientId: patientRepresentativeLinks.patientId,
        isActive: patientRepresentativeLinks.isActive,
      })
      .from(patientRepresentativeLinks)
      .where(
        and(
          eq(patientRepresentativeLinks.id, linkId),
          eq(patientRepresentativeLinks.organizationId, organizationId)
        )
      );

    if (!existing) {
      throw new Error('Lien représentant introuvable dans cette organisation');
    }

    return db.transaction(async (tx) => {
      if (input.isPrimaryContact) {
        await tx
          .update(patientRepresentativeLinks)
          .set({ isPrimaryContact: false, updatedAt: sql`now()` })
          .where(
            and(
              eq(patientRepresentativeLinks.organizationId, organizationId),
              eq(patientRepresentativeLinks.patientId, existing.patientId),
              eq(patientRepresentativeLinks.isActive, true)
            )
          );
      }

      const [updated] = await tx
        .update(patientRepresentativeLinks)
        .set({
          ...input,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(patientRepresentativeLinks.id, linkId),
            eq(patientRepresentativeLinks.organizationId, organizationId)
          )
        )
        .returning({
          id: patientRepresentativeLinks.id,
          patientId: patientRepresentativeLinks.patientId,
          representativeId: patientRepresentativeLinks.representativeId,
          relationship: patientRepresentativeLinks.relationship,
          isLegalRepresentative: patientRepresentativeLinks.isLegalRepresentative,
          isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
          isEmergencyContact: patientRepresentativeLinks.isEmergencyContact,
          isBillingContact: patientRepresentativeLinks.isBillingContact,
          isActive: patientRepresentativeLinks.isActive,
        });

      return {
        ...updated,
        relationship: updated.relationship as PatientRelationshipCode,
      };
    });
  },

  /**
   * Active ou désactive (soft archive) un lien patient ↔ représentant
   */
  async setRepresentativeLinkActive(
    organizationId: string,
    linkId: string,
    isActive: boolean
  ): Promise<PatientRepresentativeLinkDTO> {
    const [existing] = await db
      .select({
        id: patientRepresentativeLinks.id,
        patientId: patientRepresentativeLinks.patientId,
        representativeId: patientRepresentativeLinks.representativeId,
        isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
      })
      .from(patientRepresentativeLinks)
      .where(
        and(
          eq(patientRepresentativeLinks.id, linkId),
          eq(patientRepresentativeLinks.organizationId, organizationId)
        )
      );

    if (!existing) {
      throw new Error('Lien représentant introuvable dans cette organisation');
    }

    // Si on réactive le lien, vérifier impérativement que le patient ET le représentant sont actifs
    if (isActive) {
      const patient = await this.getPatientById(organizationId, existing.patientId);
      if (!patient || !patient.isActive) {
        throw new Error('Impossible de réactiver un lien pour un patient archivé ou introuvable');
      }

      const [representative] = await db
        .select({ 
          id: patientRepresentatives.id, 
          isActive: patientRepresentatives.isActive 
        })
        .from(patientRepresentatives)
        .where(
          and(
            eq(patientRepresentatives.id, existing.representativeId),
            eq(patientRepresentatives.organizationId, organizationId)
          )
        );

      if (!representative || !representative.isActive) {
        throw new Error('Impossible de réactiver un lien pour un représentant archivé ou introuvable');
      }
    }

    return db.transaction(async (tx) => {
      // Si on réactive et qu'il était marqué contact principal, s'assurer qu'aucun autre n'est actif
      if (isActive && existing.isPrimaryContact) {
        await tx
          .update(patientRepresentativeLinks)
          .set({ isPrimaryContact: false, updatedAt: sql`now()` })
          .where(
            and(
              eq(patientRepresentativeLinks.organizationId, organizationId),
              eq(patientRepresentativeLinks.patientId, existing.patientId),
              eq(patientRepresentativeLinks.isActive, true)
            )
          );
      }

      const [updated] = await tx
        .update(patientRepresentativeLinks)
        .set({
          isActive,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(patientRepresentativeLinks.id, linkId),
            eq(patientRepresentativeLinks.organizationId, organizationId)
          )
        )
        .returning({
          id: patientRepresentativeLinks.id,
          patientId: patientRepresentativeLinks.patientId,
          representativeId: patientRepresentativeLinks.representativeId,
          relationship: patientRepresentativeLinks.relationship,
          isLegalRepresentative: patientRepresentativeLinks.isLegalRepresentative,
          isPrimaryContact: patientRepresentativeLinks.isPrimaryContact,
          isEmergencyContact: patientRepresentativeLinks.isEmergencyContact,
          isBillingContact: patientRepresentativeLinks.isBillingContact,
          isActive: patientRepresentativeLinks.isActive,
        });

      return {
        ...updated,
        relationship: updated.relationship as PatientRelationshipCode,
      };
    });
  },
};
