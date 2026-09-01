import { db } from '../db/server';
import { 
  practiceLocations, 
  practicePractitioners, 
  practitionerLocations, 
  practiceRooms, 
  practiceResources,
  users
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { 
  PracticeLocationDTO,
  PracticePractitionerDTO,
  PracticeRoomDTO,
  PracticeResourceDTO,
  PractitionerLocationAssignmentDTO,
  PracticeStructureOverview
} from '../practice-structure/types';

export const practiceStructureService = {
  // -------------------------------------------------------------------------
  // LOCATIONS
  // -------------------------------------------------------------------------
  async listLocations(organizationId: string): Promise<PracticeLocationDTO[]> {
    return db.select().from(practiceLocations)
      .where(eq(practiceLocations.organizationId, organizationId))
      .orderBy(desc(practiceLocations.isPrimary), desc(practiceLocations.isActive));
  },

  async createLocation(organizationId: string, data: any): Promise<PracticeLocationDTO> {
    // Check if this is the first location
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
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      timezone: data.timezone,
      phone: data.phone,
      isPrimary,
      isActive: true,
    }).returning();
    return created;
  },

  async updateLocation(organizationId: string, id: string, data: any): Promise<PracticeLocationDTO> {
    const [updated] = await db.update(practiceLocations)
      .set({
        name: data.name,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        timezone: data.timezone,
        phone: data.phone,
        updatedAt: new Date()
      })
      .where(and(
        eq(practiceLocations.id, id),
        eq(practiceLocations.organizationId, organizationId)
      ))
      .returning();
    if (!updated) throw new Error('Location introuvable');
    return updated;
  },

  async setPrimaryLocation(organizationId: string, id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove primary from all
      await tx.update(practiceLocations)
        .set({ isPrimary: false })
        .where(eq(practiceLocations.organizationId, organizationId));
      
      // Set new primary
      const [updated] = await tx.update(practiceLocations)
        .set({ isPrimary: true })
        .where(and(
          eq(practiceLocations.id, id),
          eq(practiceLocations.organizationId, organizationId),
          eq(practiceLocations.isActive, true)
        ))
        .returning();
        
      if (!updated) throw new Error('Location introuvable ou inactive');
    });
  },

  async setLocationActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    await db.update(practiceLocations)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practiceLocations.id, id),
        eq(practiceLocations.organizationId, organizationId)
      ));
  },

  // -------------------------------------------------------------------------
  // PRACTITIONERS
  // -------------------------------------------------------------------------
  async listPractitioners(organizationId: string): Promise<PracticePractitionerDTO[]> {
    return db.select().from(practicePractitioners)
      .where(eq(practicePractitioners.organizationId, organizationId))
      .orderBy(desc(practicePractitioners.isActive));
  },

  async createPractitioner(organizationId: string, data: any): Promise<PracticePractitionerDTO> {
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
    }).returning();
    return created;
  },

  async updatePractitioner(organizationId: string, id: string, data: any): Promise<PracticePractitionerDTO> {
    if (data.userId !== undefined && data.userId !== null) {
      await this.validateLinkedUser(organizationId, data.userId);
    }

    const updateData: any = {
      displayName: data.displayName,
      profession: data.profession,
      email: data.email || null,
      phone: data.phone || null,
      updatedAt: new Date()
    };
    if (data.userId !== undefined) {
      updateData.userId = data.userId || null;
    }

    const [updated] = await db.update(practicePractitioners)
      .set(updateData)
      .where(and(
        eq(practicePractitioners.id, id),
        eq(practicePractitioners.organizationId, organizationId)
      ))
      .returning();
    if (!updated) throw new Error('Praticien introuvable');
    return updated;
  },

  async setPractitionerActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    await db.update(practicePractitioners)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practicePractitioners.id, id),
        eq(practicePractitioners.organizationId, organizationId)
      ));
  },

  async setPractitionerLocations(
    organizationId: string, 
    practitionerId: string, 
    assignments: { locationId: string, isPrimary: boolean }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Vérifier que toutes les locations appartiennent à l'organisation
      if (assignments.length > 0) {
        const locIds = assignments.map(a => a.locationId);
        const locs = await tx.select({ id: practiceLocations.id }).from(practiceLocations)
          .where(and(
            eq(practiceLocations.organizationId, organizationId),
            // inArray n'est pas utilisé pour simplifier, on peut filtrer côté app
          ));
        const validLocIds = new Set(locs.map(l => l.id));
        for (const locId of locIds) {
          if (!validLocIds.has(locId)) throw new Error(`Lieu ${locId} invalide`);
        }
      }

      // Désactiver les anciennes assignations
      await tx.update(practitionerLocations)
        .set({ isActive: false, isPrimary: false, updatedAt: new Date() })
        .where(and(
          eq(practitionerLocations.organizationId, organizationId),
          eq(practitionerLocations.practitionerId, practitionerId)
        ));

      // Insérer ou mettre à jour (upsert n'est pas trivialement fait ici, on va vérifier l'existence)
      for (const assign of assignments) {
        const existing = await tx.select().from(practitionerLocations)
          .where(and(
            eq(practitionerLocations.organizationId, organizationId),
            eq(practitionerLocations.practitionerId, practitionerId),
            eq(practitionerLocations.locationId, assign.locationId)
          ))
          .limit(1);

        if (existing.length > 0) {
          await tx.update(practitionerLocations)
            .set({ isPrimary: assign.isPrimary, isActive: true, updatedAt: new Date() })
            .where(eq(practitionerLocations.id, existing[0].id));
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

  async validateLinkedUser(organizationId: string, userId: string) {
    const user = await db.select().from(users).where(and(
      eq(users.id, userId),
      eq(users.organizationId, organizationId),
      eq(users.profileType, 'professional')
    )).limit(1);
    
    if (user.length === 0) {
      throw new Error('Utilisateur invalide ou non autorisé pour ce cabinet.');
    }
  },

  // -------------------------------------------------------------------------
  // ROOMS
  // -------------------------------------------------------------------------
  async listRooms(organizationId: string): Promise<PracticeRoomDTO[]> {
    return db.select().from(practiceRooms)
      .where(eq(practiceRooms.organizationId, organizationId))
      .orderBy(desc(practiceRooms.isActive));
  },

  async createRoom(organizationId: string, data: any): Promise<PracticeRoomDTO> {
    await this.validateLocation(organizationId, data.locationId);

    const id = randomUUID();
    const [created] = await db.insert(practiceRooms).values({
      id,
      organizationId,
      locationId: data.locationId,
      name: data.name,
      description: data.description,
      isActive: true,
    }).returning();
    return created;
  },

  async updateRoom(organizationId: string, id: string, data: any): Promise<PracticeRoomDTO> {
    const [updated] = await db.update(practiceRooms)
      .set({
        name: data.name,
        description: data.description,
        updatedAt: new Date()
      })
      .where(and(
        eq(practiceRooms.id, id),
        eq(practiceRooms.organizationId, organizationId)
      ))
      .returning();
    if (!updated) throw new Error('Salle introuvable');
    return updated;
  },

  async setRoomActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    await db.update(practiceRooms)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practiceRooms.id, id),
        eq(practiceRooms.organizationId, organizationId)
      ));
  },

  // -------------------------------------------------------------------------
  // RESOURCES
  // -------------------------------------------------------------------------
  async listResources(organizationId: string): Promise<PracticeResourceDTO[]> {
    return db.select().from(practiceResources)
      .where(eq(practiceResources.organizationId, organizationId))
      .orderBy(desc(practiceResources.isActive));
  },

  async createResource(organizationId: string, data: any): Promise<PracticeResourceDTO> {
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
      description: data.description,
      isActive: true,
    }).returning();
    return created;
  },

  async updateResource(organizationId: string, id: string, data: any): Promise<PracticeResourceDTO> {
    const [updated] = await db.update(practiceResources)
      .set({
        name: data.name,
        description: data.description,
        updatedAt: new Date()
      })
      .where(and(
        eq(practiceResources.id, id),
        eq(practiceResources.organizationId, organizationId)
      ))
      .returning();
    if (!updated) throw new Error('Ressource introuvable');
    return updated;
  },

  async setResourceActive(organizationId: string, id: string, isActive: boolean): Promise<void> {
    await db.update(practiceResources)
      .set({ isActive, updatedAt: new Date() })
      .where(and(
        eq(practiceResources.id, id),
        eq(practiceResources.organizationId, organizationId)
      ));
  },

  // -------------------------------------------------------------------------
  // HELPERS & OVERVIEW
  // -------------------------------------------------------------------------
  async validateLocation(organizationId: string, locationId: string) {
    const loc = await db.select({ id: practiceLocations.id }).from(practiceLocations)
      .where(and(
        eq(practiceLocations.id, locationId),
        eq(practiceLocations.organizationId, organizationId)
      )).limit(1);
    if (loc.length === 0) throw new Error('Lieu invalide');
  },

  async validateRoom(organizationId: string, locationId: string, roomId: string) {
    const room = await db.select({ id: practiceRooms.id }).from(practiceRooms)
      .where(and(
        eq(practiceRooms.id, roomId),
        eq(practiceRooms.locationId, locationId),
        eq(practiceRooms.organizationId, organizationId)
      )).limit(1);
    if (room.length === 0) throw new Error('Salle invalide ou n\'appartenant pas à ce lieu');
  },

  async getOverview(organizationId: string): Promise<PracticeStructureOverview> {
    const [locations, practitioners, assignments, rooms, resources] = await Promise.all([
      db.select().from(practiceLocations).where(eq(practiceLocations.organizationId, organizationId)),
      db.select().from(practicePractitioners).where(eq(practicePractitioners.organizationId, organizationId)),
      db.select().from(practitionerLocations).where(eq(practitionerLocations.organizationId, organizationId)),
      db.select().from(practiceRooms).where(eq(practiceRooms.organizationId, organizationId)),
      db.select().from(practiceResources).where(eq(practiceResources.organizationId, organizationId)),
    ]);

    return {
      locations,
      practitioners,
      assignments,
      rooms,
      resources
    };
  }
};
