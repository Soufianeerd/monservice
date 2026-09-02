import { db } from '../db/server';
import { 
  practiceLocations, 
  practicePractitioners, 
  practitionerLocations, 
  practiceRooms, 
  practiceResources,
  users
} from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { 
  PracticeLocationDTO,
  PracticePractitionerDTO,
  PracticeRoomDTO,
  PracticeResourceDTO,
  PracticeStructureOverview,
  LinkedProfessionalUser
} from '../practice-structure/types';
import type {
  PracticeLocationCreateInput,
  PracticeLocationUpdateInput,
  PracticePractitionerCreateInput,
  PracticePractitionerUpdateInput,
  PracticeRoomCreateInput,
  PracticeRoomUpdateInput,
  PracticeResourceCreateInput,
  PracticeResourceUpdateInput,
  PractitionerLocationAssignmentInput
} from '../practice-structure/validation';

export const practiceStructureService = {
  // -------------------------------------------------------------------------
  // LOCATIONS
  // -------------------------------------------------------------------------
  async listLocations(organizationId: string): Promise<PracticeLocationDTO[]> {
    return db.select({
      id: practiceLocations.id,
      name: practiceLocations.name,
      address: practiceLocations.address,
      city: practiceLocations.city,
      postalCode: practiceLocations.postalCode,
      country: practiceLocations.country,
      timezone: practiceLocations.timezone,
      phone: practiceLocations.phone,
      isPrimary: practiceLocations.isPrimary,
      isActive: practiceLocations.isActive,
    }).from(practiceLocations)
      .where(eq(practiceLocations.organizationId, organizationId))
      .orderBy(desc(practiceLocations.isPrimary), desc(practiceLocations.isActive));
  },

  async createLocation(organizationId: string, data: PracticeLocationCreateInput): Promise<PracticeLocationDTO> {
    const existing = await db.select({ id: practiceLocations.id }).from(practiceLocations)
      .where(and(
        eq(practiceLocations.organizationId, organizationId),
        eq(practiceLocations.isActive, true)
      ))
      .limit(1);
    
    const isPrimary = existing.length === 0;

    const id = randomUUID();
    const [created] = await db.insert(practiceLocations).values({
      id,
      organizationId,
      name: data.name,
      address: data.address ?? null,
      city: data.city ?? null,
      postalCode: data.postalCode ?? null,
      country: data.country ?? null,
      timezone: data.timezone,
      phone: data.phone ?? null,
      isPrimary,
      isActive: true,
    }).returning({
      id: practiceLocations.id,
      name: practiceLocations.name,
      address: practiceLocations.address,
      city: practiceLocations.city,
      postalCode: practiceLocations.postalCode,
      country: practiceLocations.country,
      timezone: practiceLocations.timezone,
      phone: practiceLocations.phone,
      isPrimary: practiceLocations.isPrimary,
      isActive: practiceLocations.isActive,
    });
    return created;
  },

  async updateLocation(organizationId: string, id: string, data: PracticeLocationUpdateInput): Promise<PracticeLocationDTO> {
    const updateValues: Partial<typeof practiceLocations.$inferInsert> = {
      updatedAt: new Date()
    };
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.address !== undefined) updateValues.address = data.address ?? null;
    if (data.city !== undefined) updateValues.city = data.city ?? null;
    if (data.postalCode !== undefined) updateValues.postalCode = data.postalCode ?? null;
    if (data.country !== undefined) updateValues.country = data.country ?? null;
    if (data.timezone !== undefined) updateValues.timezone = data.timezone;
    if (data.phone !== undefined) updateValues.phone = data.phone ?? null;

    const [updated] = await db.update(practiceLocations)
      .set(updateValues)
      .where(and(
        eq(practiceLocations.id, id),
        eq(practiceLocations.organizationId, organizationId)
      ))
      .returning({
        id: practiceLocations.id,
        name: practiceLocations.name,
        address: practiceLocations.address,
        city: practiceLocations.city,
        postalCode: practiceLocations.postalCode,
        country: practiceLocations.country,
        timezone: practiceLocations.timezone,
        phone: practiceLocations.phone,
        isPrimary: practiceLocations.isPrimary,
        isActive: practiceLocations.isActive,
      });
    if (!updated) throw new Error('Location introuvable');
    return updated;
  },

  async setPrimaryLocation(organizationId: string, id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove primary from all
      await tx.update(practiceLocations)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(practiceLocations.organizationId, organizationId));
      
      // Set new primary
      const [updated] = await tx.update(practiceLocations)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(and(
          eq(practiceLocations.id, id),
          eq(practiceLocations.organizationId, organizationId),
          eq(practiceLocations.isActive, true)
        ))
        .returning({ id: practiceLocations.id });
        
      if (!updated) throw new Error('Location introuvable ou inactive');
    });
  },

  async setLocationActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    const [updated] = await db.update(practiceLocations)
      .set({ isActive, isPrimary: isActive ? undefined : false, updatedAt: new Date() })
      .where(and(
        eq(practiceLocations.id, id),
        eq(practiceLocations.organizationId, organizationId)
      ))
      .returning({ id: practiceLocations.id });
    if (!updated) throw new Error('Location introuvable');
  },

  // -------------------------------------------------------------------------
  // PRACTITIONERS
  // -------------------------------------------------------------------------
  async listPractitioners(organizationId: string): Promise<PracticePractitionerDTO[]> {
    return db.select({
      id: practicePractitioners.id,
      userId: practicePractitioners.userId,
      displayName: practicePractitioners.displayName,
      profession: practicePractitioners.profession,
      email: practicePractitioners.email,
      phone: practicePractitioners.phone,
      isActive: practicePractitioners.isActive,
    }).from(practicePractitioners)
      .where(eq(practicePractitioners.organizationId, organizationId))
      .orderBy(desc(practicePractitioners.isActive));
  },

  async createPractitioner(organizationId: string, data: PracticePractitionerCreateInput): Promise<PracticePractitionerDTO> {
    if (data.userId) {
      await this.validateLinkedUser(organizationId, data.userId);
    }

    const id = randomUUID();
    const [created] = await db.insert(practicePractitioners).values({
      id,
      organizationId,
      userId: data.userId || null,
      displayName: data.displayName,
      profession: data.profession,
      email: data.email || null,
      phone: data.phone || null,
      isActive: true,
    }).returning({
      id: practicePractitioners.id,
      userId: practicePractitioners.userId,
      displayName: practicePractitioners.displayName,
      profession: practicePractitioners.profession,
      email: practicePractitioners.email,
      phone: practicePractitioners.phone,
      isActive: practicePractitioners.isActive,
    });
    return created;
  },

  async updatePractitioner(organizationId: string, id: string, data: PracticePractitionerUpdateInput): Promise<PracticePractitionerDTO> {
    if (data.userId) {
      await this.validateLinkedUser(organizationId, data.userId);
    }

    const updateValues: Partial<typeof practicePractitioners.$inferInsert> = {
      updatedAt: new Date()
    };
    if (data.displayName !== undefined) updateValues.displayName = data.displayName;
    if (data.profession !== undefined) updateValues.profession = data.profession;
    if (data.email !== undefined) updateValues.email = data.email || null;
    if (data.phone !== undefined) updateValues.phone = data.phone || null;
    if (data.userId !== undefined) updateValues.userId = data.userId || null;

    const [updated] = await db.update(practicePractitioners)
      .set(updateValues)
      .where(and(
        eq(practicePractitioners.id, id),
        eq(practicePractitioners.organizationId, organizationId)
      ))
      .returning({
        id: practicePractitioners.id,
        userId: practicePractitioners.userId,
        displayName: practicePractitioners.displayName,
        profession: practicePractitioners.profession,
        email: practicePractitioners.email,
        phone: practicePractitioners.phone,
        isActive: practicePractitioners.isActive,
      });
    if (!updated) throw new Error('Praticien introuvable');
    return updated;
  },

  async setPractitionerActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    const [updated] = await db.update(practicePractitioners)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practicePractitioners.id, id),
        eq(practicePractitioners.organizationId, organizationId)
      ))
      .returning({ id: practicePractitioners.id });
    if (!updated) throw new Error('Praticien introuvable');
  },

  async setPractitionerLocations(
    organizationId: string, 
    practitionerId: string, 
    assignments: PractitionerLocationAssignmentInput[]
  ): Promise<void> {
    const primaryCount = assignments.filter(a => a.isPrimary).length;
    if (primaryCount > 1) {
      throw new Error('Un praticien ne peut avoir qu’un seul lieu principal');
    }

    await db.transaction(async (tx) => {
      // 1. Vérifier existence praticien tenant-scoped
      const [prac] = await tx.select({ id: practicePractitioners.id }).from(practicePractitioners)
        .where(and(
          eq(practicePractitioners.id, practitionerId),
          eq(practicePractitioners.organizationId, organizationId)
        ))
        .limit(1);
      if (!prac) throw new Error('Praticien introuvable');

      // 2. Vérifier que toutes les locations cibles existent, sont actives et appartiennent à l'organisation
      if (assignments.length > 0) {
        const targetLocationIds = assignments.map(a => a.locationId);
        const validLocations = await tx.select({ id: practiceLocations.id }).from(practiceLocations)
          .where(and(
            eq(practiceLocations.organizationId, organizationId),
            eq(practiceLocations.isActive, true),
            inArray(practiceLocations.id, targetLocationIds)
          ));
        
        if (validLocations.length !== targetLocationIds.length) {
          throw new Error('Un ou plusieurs lieux sont invalides ou inactifs');
        }
      }

      // 3. Désactiver les anciennes assignations du praticien
      await tx.update(practitionerLocations)
        .set({ isActive: false, isPrimary: false, updatedAt: new Date() })
        .where(and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, practitionerId)
        ));

      // 4. Insérer ou réactiver les assignations fournies
      for (const assign of assignments) {
        const [existing] = await tx.select({ id: practitionerLocations.id }).from(practitionerLocations)
          .where(and(
            eq(practitionerLocations.organizationId, organizationId),
            eq(practitionerLocations.practitionerId, practitionerId),
            eq(practitionerLocations.locationId, assign.locationId)
          ))
          .limit(1);

        if (existing) {
          await tx.update(practitionerLocations)
            .set({ isPrimary: assign.isPrimary, isActive: true, updatedAt: new Date() })
            .where(eq(practitionerLocations.id, existing.id));
        } else {
          await tx.insert(practitionerLocations).values({
            id: randomUUID(),
            organizationId,
            practitionerId,
            locationId: assign.locationId,
            isPrimary: assign.isPrimary,
            isActive: true,
          });
        }
      }
    });
  },

  async validateLinkedUser(organizationId: string, userId: string): Promise<void> {
    const user = await db.select({ id: users.id }).from(users).where(and(
      eq(users.id, userId),
      eq(users.organizationId, organizationId),
      eq(users.profileType, 'professional')
    )).limit(1);
    
    if (user.length === 0) {
      throw new Error('Utilisateur invalide ou non autorisé pour ce cabinet.');
    }
  },

  async listEligibleProfessionalUsers(organizationId: string): Promise<LinkedProfessionalUser[]> {
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(and(
      eq(users.organizationId, organizationId),
      eq(users.profileType, 'professional')
    ));
  },

  // -------------------------------------------------------------------------
  // ROOMS
  // -------------------------------------------------------------------------
  async listRooms(organizationId: string): Promise<PracticeRoomDTO[]> {
    return db.select({
      id: practiceRooms.id,
      locationId: practiceRooms.locationId,
      name: practiceRooms.name,
      description: practiceRooms.description,
      isActive: practiceRooms.isActive,
    }).from(practiceRooms)
      .where(eq(practiceRooms.organizationId, organizationId))
      .orderBy(desc(practiceRooms.isActive));
  },

  async createRoom(organizationId: string, data: PracticeRoomCreateInput): Promise<PracticeRoomDTO> {
    await this.validateLocation(organizationId, data.locationId);

    const id = randomUUID();
    const [created] = await db.insert(practiceRooms).values({
      id,
      organizationId,
      locationId: data.locationId,
      name: data.name,
      description: data.description ?? null,
      isActive: true,
    }).returning({
      id: practiceRooms.id,
      locationId: practiceRooms.locationId,
      name: practiceRooms.name,
      description: practiceRooms.description,
      isActive: practiceRooms.isActive,
    });
    return created;
  },

  async updateRoom(organizationId: string, id: string, data: PracticeRoomUpdateInput): Promise<PracticeRoomDTO> {
    const updateValues: Partial<typeof practiceRooms.$inferInsert> = {
      updatedAt: new Date()
    };
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.description !== undefined) updateValues.description = data.description ?? null;

    const [updated] = await db.update(practiceRooms)
      .set(updateValues)
      .where(and(
        eq(practiceRooms.id, id),
        eq(practiceRooms.organizationId, organizationId)
      ))
      .returning({
        id: practiceRooms.id,
        locationId: practiceRooms.locationId,
        name: practiceRooms.name,
        description: practiceRooms.description,
        isActive: practiceRooms.isActive,
      });
    if (!updated) throw new Error('Salle introuvable');
    return updated;
  },

  async setRoomActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    const [updated] = await db.update(practiceRooms)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practiceRooms.id, id),
        eq(practiceRooms.organizationId, organizationId)
      ))
      .returning({ id: practiceRooms.id });
    if (!updated) throw new Error('Salle introuvable');
  },

  // -------------------------------------------------------------------------
  // RESOURCES
  // -------------------------------------------------------------------------
  async listResources(organizationId: string): Promise<PracticeResourceDTO[]> {
    return db.select({
      id: practiceResources.id,
      locationId: practiceResources.locationId,
      roomId: practiceResources.roomId,
      name: practiceResources.name,
      description: practiceResources.description,
      isActive: practiceResources.isActive,
    }).from(practiceResources)
      .where(eq(practiceResources.organizationId, organizationId))
      .orderBy(desc(practiceResources.isActive));
  },

  async createResource(organizationId: string, data: PracticeResourceCreateInput): Promise<PracticeResourceDTO> {
    await this.validateLocation(organizationId, data.locationId);
    if (data.roomId) {
      await this.validateRoom(organizationId, data.locationId, data.roomId);
    }

    const id = randomUUID();
    const [created] = await db.insert(practiceResources).values({
      id,
      organizationId,
      locationId: data.locationId,
      roomId: data.roomId || null,
      name: data.name,
      description: data.description ?? null,
      isActive: true,
    }).returning({
      id: practiceResources.id,
      locationId: practiceResources.locationId,
      roomId: practiceResources.roomId,
      name: practiceResources.name,
      description: practiceResources.description,
      isActive: practiceResources.isActive,
    });
    return created;
  },

  async updateResource(organizationId: string, id: string, data: PracticeResourceUpdateInput): Promise<PracticeResourceDTO> {
    const updateValues: Partial<typeof practiceResources.$inferInsert> = {
      updatedAt: new Date()
    };
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.description !== undefined) updateValues.description = data.description ?? null;

    const [updated] = await db.update(practiceResources)
      .set(updateValues)
      .where(and(
        eq(practiceResources.id, id),
        eq(practiceResources.organizationId, organizationId)
      ))
      .returning({
        id: practiceResources.id,
        locationId: practiceResources.locationId,
        roomId: practiceResources.roomId,
        name: practiceResources.name,
        description: practiceResources.description,
        isActive: practiceResources.isActive,
      });
    if (!updated) throw new Error('Ressource introuvable');
    return updated;
  },

  async setResourceActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    const [updated] = await db.update(practiceResources)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practiceResources.id, id),
        eq(practiceResources.organizationId, organizationId)
      ))
      .returning({ id: practiceResources.id });
    if (!updated) throw new Error('Ressource introuvable');
  },

  // -------------------------------------------------------------------------
  // HELPERS & OVERVIEW
  // -------------------------------------------------------------------------
  async validateLocation(organizationId: string, locationId: string): Promise<void> {
    const loc = await db.select({ id: practiceLocations.id, isActive: practiceLocations.isActive }).from(practiceLocations)
      .where(and(
        eq(practiceLocations.id, locationId),
        eq(practiceLocations.organizationId, organizationId)
      )).limit(1);
    if (loc.length === 0) throw new Error('Lieu introuvable');
    if (!loc[0].isActive) throw new Error('Lieu inactif');
  },

  async validateRoom(organizationId: string, locationId: string, roomId: string): Promise<void> {
    const room = await db.select({ id: practiceRooms.id, isActive: practiceRooms.isActive }).from(practiceRooms)
      .where(and(
        eq(practiceRooms.id, roomId),
        eq(practiceRooms.locationId, locationId),
        eq(practiceRooms.organizationId, organizationId)
      )).limit(1);
    if (room.length === 0) throw new Error('Salle introuvable ou n\'appartenant pas à ce lieu');
    if (!room[0].isActive) throw new Error('Salle inactive');
  },

  async getOverview(organizationId: string): Promise<PracticeStructureOverview> {
    const [locations, practitioners, assignments, rooms, resources, eligibleUsers] = await Promise.all([
      this.listLocations(organizationId),
      this.listPractitioners(organizationId),
      db.select({
        id: practitionerLocations.id,
        practitionerId: practitionerLocations.practitionerId,
        locationId: practitionerLocations.locationId,
        isPrimary: practitionerLocations.isPrimary,
        isActive: practitionerLocations.isActive,
      }).from(practitionerLocations).where(eq(practitionerLocations.organizationId, organizationId)),
      this.listRooms(organizationId),
      this.listResources(organizationId),
      this.listEligibleProfessionalUsers(organizationId),
    ]);

    return {
      locations,
      practitioners,
      assignments,
      rooms,
      resources,
      eligibleUsers,
    };
  }
};

