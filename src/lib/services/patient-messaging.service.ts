import { db } from '@/lib/db/server';
import {
  messages,
  patientPortalAccess,
  patientProfiles,
  practicePractitioners,
  users,
} from '@/lib/db/schema';
import { eq, and, or, asc, inArray } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { randomUUID } from 'crypto';
import type { PatientPortalMessageDTO } from '@/lib/patient-messaging/types';

export class PatientMessagingService {
  /**
   * Envoi d'un message depuis le portail patient vers un praticien.
   */
  async sendPatientMessage(
    authUserId: string,
    input: {
      patientId: string;
      practitionerId: string;
      content: string;
    },
  ): Promise<PatientPortalMessageDTO> {
    const trimmedContent = input.content.trim();
    if (!trimmedContent) {
      throw new AppError('Le contenu du message ne peut pas être vide', 400, 'EMPTY_MESSAGE');
    }

    // 1. Verify portal access
    const [access] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.patientId, input.patientId),
          eq(patientPortalAccess.userId, authUserId),
          eq(patientPortalAccess.isActive, true),
        ),
      );

    if (!access) {
      throw new AppError('Accès portail non autorisé pour ce patient', 403, 'FORBIDDEN');
    }

    const organizationId = access.organizationId;

    // 2. Verify practitioner
    const [practitioner] = await db
      .select({
        practitioner: practicePractitioners,
        user: users,
      })
      .from(practicePractitioners)
      .leftJoin(users, eq(users.id, practicePractitioners.userId))
      .where(
        and(
          eq(practicePractitioners.id, input.practitionerId),
          eq(practicePractitioners.organizationId, organizationId),
          eq(practicePractitioners.isActive, true),
        ),
      );

    if (!practitioner) {
      throw new AppError('Praticien introuvable ou inactif dans ce cabinet', 404, 'PRACTITIONER_NOT_FOUND');
    }

    const receiverId = practitioner.practitioner.userId;
    if (!receiverId) {
      throw new AppError('Le praticien n’a pas de compte utilisateur lié pour la messagerie', 400, 'PRACTITIONER_NO_USER');
    }

    // 3. Create message
    const now = new Date().toISOString();
    const messageId = randomUUID();

    await db.insert(messages).values({
      id: messageId,
      organizationId,
      patientId: input.patientId,
      senderId: authUserId,
      receiverId,
      content: trimmedContent,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: messageId,
      organizationId,
      patientId: input.patientId,
      senderId: authUserId,
      receiverId,
      content: trimmedContent,
      isRead: false,
      senderRole: access.accessType === 'representative' ? 'representative' : 'patient',
      createdAt: now,
    };
  }

  /**
   * Envoi d'un message depuis le praticien vers le patient (portail).
   */
  async sendPractitionerMessage(
    organizationId: string,
    practitionerUserId: string,
    input: {
      patientId: string;
      portalUserId: string;
      content: string;
    },
  ): Promise<PatientPortalMessageDTO> {
    const trimmedContent = input.content.trim();
    if (!trimmedContent) {
      throw new AppError('Le contenu du message ne peut pas être vide', 400, 'EMPTY_MESSAGE');
    }

    // 1. Verify patient exists in organization
    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, input.patientId),
          eq(patientProfiles.organizationId, organizationId),
          eq(patientProfiles.isActive, true),
        ),
      );

    if (!patient) {
      throw new AppError('Dossier patient introuvable ou inactif', 404, 'PATIENT_NOT_FOUND');
    }

    // 2. Verify receiver portal user has active access
    const [access] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.patientId, input.patientId),
          eq(patientPortalAccess.userId, input.portalUserId),
          eq(patientPortalAccess.organizationId, organizationId),
          eq(patientPortalAccess.isActive, true),
        ),
      );

    if (!access) {
      throw new AppError('Destinataire portail non autorisé ou inactif', 403, 'FORBIDDEN');
    }

    // 3. Create message
    const now = new Date().toISOString();
    const messageId = randomUUID();

    await db.insert(messages).values({
      id: messageId,
      organizationId,
      patientId: input.patientId,
      senderId: practitionerUserId,
      receiverId: input.portalUserId,
      content: trimmedContent,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: messageId,
      organizationId,
      patientId: input.patientId,
      senderId: practitionerUserId,
      receiverId: input.portalUserId,
      content: trimmedContent,
      isRead: false,
      senderRole: 'practitioner',
      createdAt: now,
    };
  }

  /**
   * Récupère le fil de discussion pour le portail patient.
   */
  async listPatientMessagesForPortal(
    authUserId: string,
    patientId: string,
  ): Promise<PatientPortalMessageDTO[]> {
    // 1. Verify access
    const [access] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.patientId, patientId),
          eq(patientPortalAccess.userId, authUserId),
          eq(patientPortalAccess.isActive, true),
        ),
      );

    if (!access) {
      throw new AppError('Accès non autorisé', 403, 'FORBIDDEN');
    }

    const messageRows = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.organizationId, access.organizationId),
          eq(messages.patientId, patientId),
          or(
            eq(messages.senderId, authUserId),
            eq(messages.receiverId, authUserId),
          ),
        ),
      )
      .orderBy(asc(messages.createdAt));

    // Fetch sender names
    const senderIds = Array.from(new Set(messageRows.map((m) => m.senderId)));
    const senderUsers = senderIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, senderIds))
      : [];
    const nameMap = new Map<string, string>(senderUsers.map((u) => [u.id, u.name || 'Utilisateur']));

    return messageRows.map((m) => {
      const isMe = m.senderId === authUserId;
      return {
        id: m.id,
        organizationId: m.organizationId,
        patientId: m.patientId || patientId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        isRead: m.isRead ?? false,
        senderName: isMe ? 'Moi' : nameMap.get(m.senderId) || 'Praticien',
        senderRole: isMe ? (access.accessType === 'representative' ? 'representative' : 'patient') : 'practitioner',
        createdAt: m.createdAt,
      };
    });
  }

  /**
   * Récupère le fil de discussion pour les praticiens du cabinet.
   */
  async listPatientMessagesForPractitioner(
    organizationId: string,
    patientId: string,
  ): Promise<PatientPortalMessageDTO[]> {
    const messageRows = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.organizationId, organizationId),
          eq(messages.patientId, patientId),
        ),
      )
      .orderBy(asc(messages.createdAt));

    const senderIds = Array.from(new Set(messageRows.map((m) => m.senderId)));
    const senderUsers = senderIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, senderIds))
      : [];
    const nameMap = new Map<string, string>(senderUsers.map((u) => [u.id, u.name || 'Utilisateur']));

    return messageRows.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      patientId: m.patientId || patientId,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      isRead: m.isRead ?? false,
      senderName: nameMap.get(m.senderId) || 'Utilisateur',
      createdAt: m.createdAt,
    }));
  }

  /**
   * Marque comme lus les messages reçus pour un patient.
   */
  async markMessagesAsRead(patientId: string, currentUserId: string): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(messages)
      .set({ isRead: true, updatedAt: now })
      .where(
        and(
          eq(messages.patientId, patientId),
          eq(messages.receiverId, currentUserId),
          eq(messages.isRead, false),
        ),
      );
  }
}

export const patientMessagingService = new PatientMessagingService();
