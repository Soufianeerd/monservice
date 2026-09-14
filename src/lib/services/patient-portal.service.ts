import { db } from '@/lib/db/server';
import {
  patientPortalAccess,
  patientProfiles,
  patientRepresentatives,
  patientRepresentativeLinks,
  users,
  appointments,
  appointmentTypes,
  practiceLocations,
  practiceRooms,
  clinicalDocuments,
  patientQuestionnaireAssignments,
  clinicalFormTemplates,
  clinicalFormResponses,
  careEpisodes,
  messages,
} from '@/lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { clinicalStorageService } from './clinical-storage.service';
import { randomUUID } from 'crypto';
import type {
  PatientPortalAccessDTO,
  PatientPortalAppointmentDTO,
  PatientSharedDocumentDTO,
  PatientQuestionnaireAssignmentDTO,
  PatientPortalOverviewDTO,
} from '@/lib/patient-portal/types';
import type { ClinicalFormAnswers, ClinicalFormTemplateSchema } from '@/lib/clinical/types';

export class PatientPortalService {
  // ==========================================
  // PORTAL ACCESS MANAGEMENT
  // ==========================================

  async grantPortalAccess(
    organizationId: string,
    practitionerId: string,
    createdByUserId: string,
    input: {
      patientId: string;
      email: string;
      representativeId?: string | null;
    },
  ): Promise<PatientPortalAccessDTO> {
    const normalizedEmail = input.email.trim().toLowerCase();

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

    // 2. If representative access: verify representative link & email
    let accessType: 'patient' | 'representative' = 'patient';
    let verifiedRepresentativeId: string | null = null;

    if (input.representativeId) {
      const [link] = await db
        .select({
          link: patientRepresentativeLinks,
          rep: patientRepresentatives,
        })
        .from(patientRepresentativeLinks)
        .innerJoin(
          patientRepresentatives,
          and(
            eq(patientRepresentatives.id, patientRepresentativeLinks.representativeId),
            eq(patientRepresentatives.organizationId, organizationId),
          ),
        )
        .where(
          and(
            eq(patientRepresentativeLinks.organizationId, organizationId),
            eq(patientRepresentativeLinks.patientId, input.patientId),
            eq(patientRepresentativeLinks.representativeId, input.representativeId),
            eq(patientRepresentativeLinks.isActive, true),
            eq(patientRepresentatives.isActive, true),
          ),
        );

      if (!link) {
        throw new AppError(
          'Représentant non lié ou inactif pour ce patient',
          400,
          'REPRESENTATIVE_LINK_INVALID',
        );
      }

      const repEmail = link.rep.email?.trim().toLowerCase();
      if (!repEmail || repEmail !== normalizedEmail) {
        throw new AppError(
          'L’email fourni ne correspond pas à l’email du représentant enregistré',
          400,
          'EMAIL_MISMATCH',
        );
      }

      accessType = 'representative';
      verifiedRepresentativeId = input.representativeId;
    } else {
      // Direct patient access: verify email matches patient profile email
      const patientEmail = patient.email?.trim().toLowerCase();
      if (!patientEmail || patientEmail !== normalizedEmail) {
        throw new AppError(
          'L’email fourni ne correspond pas à l’email enregistré dans le dossier patient',
          400,
          'EMAIL_MISMATCH',
        );
      }
    }

    // 3. Lookup user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      throw new AppError(
        'Aucun compte utilisateur trouvé avec cet email. Le patient ou représentant doit créer un compte avant l’activation du portail.',
        404,
        'USER_ACCOUNT_NOT_FOUND',
      );
    }

    if (user.profileType !== 'client') {
      throw new AppError(
        'Le compte associé n’est pas un compte client/patient',
        400,
        'INVALID_USER_PROFILE_TYPE',
      );
    }

    // 4. Check existing access record for idempotency
    const [existing] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.organizationId, organizationId),
          eq(patientPortalAccess.patientId, input.patientId),
          eq(patientPortalAccess.userId, user.id),
        ),
      );

    const now = new Date();
    if (existing) {
      if (!existing.isActive || existing.accessType !== accessType || existing.representativeId !== verifiedRepresentativeId) {
        const [updated] = await db
          .update(patientPortalAccess)
          .set({
            isActive: true,
            accessType,
            representativeId: verifiedRepresentativeId,
            updatedAt: now,
          })
          .where(eq(patientPortalAccess.id, existing.id))
          .returning();

        return this.mapPortalAccessToDTO(updated);
      }
      return this.mapPortalAccessToDTO(existing);
    }

    // 5. Create new portal access
    const newAccessId = randomUUID();
    const [created] = await db
      .insert(patientPortalAccess)
      .values({
        id: newAccessId,
        organizationId,
        patientId: input.patientId,
        userId: user.id,
        accessType,
        representativeId: verifiedRepresentativeId,
        isActive: true,
        createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapPortalAccessToDTO(created);
  }

  async revokePortalAccess(
    organizationId: string,
    accessId: string,
  ): Promise<PatientPortalAccessDTO> {
    const [existing] = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.id, accessId),
          eq(patientPortalAccess.organizationId, organizationId),
        ),
      );

    if (!existing) {
      throw new AppError('Accès portail introuvable', 404, 'PORTAL_ACCESS_NOT_FOUND');
    }

    const [updated] = await db
      .update(patientPortalAccess)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(patientPortalAccess.id, accessId))
      .returning();

    return this.mapPortalAccessToDTO(updated);
  }

  async listPortalAccessesForPatient(
    organizationId: string,
    patientId: string,
  ): Promise<PatientPortalAccessDTO[]> {
    const rows = await db
      .select()
      .from(patientPortalAccess)
      .where(
        and(
          eq(patientPortalAccess.organizationId, organizationId),
          eq(patientPortalAccess.patientId, patientId),
        ),
      )
      .orderBy(desc(patientPortalAccess.createdAt));

    return rows.map((r) => this.mapPortalAccessToDTO(r));
  }

  async listPortalAccessesForUser(userId: string): Promise<PatientPortalAccessDTO[]> {
    const rows = await db
      .select({
        access: patientPortalAccess,
        patient: patientProfiles,
      })
      .from(patientPortalAccess)
      .innerJoin(
        patientProfiles,
        and(
          eq(patientProfiles.id, patientPortalAccess.patientId),
          eq(patientProfiles.organizationId, patientPortalAccess.organizationId),
        ),
      )
      .where(
        and(
          eq(patientPortalAccess.userId, userId),
          eq(patientPortalAccess.isActive, true),
        ),
      );

    return rows.map(({ access, patient }) => ({
      ...this.mapPortalAccessToDTO(access),
      patientName: `${patient.usedFirstName || patient.firstBirthName} ${patient.usedName || patient.birthName}`,
    }));
  }

  // ==========================================
  // PATIENT APPOINTMENTS PROJECTION
  // ==========================================

  async getPatientAppointmentsForPortal(
    organizationId: string,
    patientId: string,
  ): Promise<PatientPortalAppointmentDTO[]> {
    const rows = await db
      .select({
        appointment: appointments,
        appointmentType: appointmentTypes,
        location: practiceLocations,
        room: practiceRooms,
      })
      .from(appointments)
      .leftJoin(
        appointmentTypes,
        and(
          eq(appointmentTypes.id, appointments.appointmentTypeId),
          eq(appointmentTypes.organizationId, appointments.organizationId),
        ),
      )
      .leftJoin(
        practiceLocations,
        and(
          eq(practiceLocations.id, appointments.locationId),
          eq(practiceLocations.organizationId, appointments.organizationId),
        ),
      )
      .leftJoin(
        practiceRooms,
        and(
          eq(practiceRooms.id, appointments.roomId),
          eq(practiceRooms.organizationId, appointments.organizationId),
        ),
      )
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.patientId, patientId),
        ),
      )
      .orderBy(desc(appointments.startsAt));

    return rows.map(({ appointment, appointmentType, location, room }) => ({
      id: appointment.id,
      organizationId: appointment.organizationId,
      patientId: appointment.patientId,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      timezone: appointment.timezone,
      status: appointment.status as 'scheduled' | 'cancelled' | 'no_show',
      appointmentTypeName: appointmentType?.name || 'Consultation',
      locationName: location?.name || 'Cabinet',
      roomName: room?.name || null,
    }));
  }

  // ==========================================
  // SHARED CLINICAL DOCUMENTS
  // ==========================================

  async getSharedDocumentsForPortal(
    organizationId: string,
    patientId: string,
  ): Promise<PatientSharedDocumentDTO[]> {
    const docs = await db
      .select()
      .from(clinicalDocuments)
      .where(
        and(
          eq(clinicalDocuments.organizationId, organizationId),
          eq(clinicalDocuments.patientId, patientId),
          eq(clinicalDocuments.patientVisible, true),
          eq(clinicalDocuments.isArchived, false),
        ),
      )
      .orderBy(desc(clinicalDocuments.createdAt));

    return docs.map((doc) => ({
      id: doc.id,
      organizationId: doc.organizationId,
      patientId: doc.patientId,
      title: doc.title,
      category: doc.category,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      createdAt: doc.createdAt.toISOString(),
    }));
  }

  async getSharedDocumentDownloadUrl(
    organizationId: string,
    patientId: string,
    documentId: string,
  ): Promise<{ downloadUrl: string; fileName: string; mimeType: string; sizeBytes: number }> {
    const [doc] = await db
      .select()
      .from(clinicalDocuments)
      .where(
        and(
          eq(clinicalDocuments.id, documentId),
          eq(clinicalDocuments.organizationId, organizationId),
          eq(clinicalDocuments.patientId, patientId),
          eq(clinicalDocuments.patientVisible, true),
          eq(clinicalDocuments.isArchived, false),
        ),
      );

    if (!doc) {
      throw new AppError('Document introuvable ou non partagé', 404, 'DOCUMENT_NOT_FOUND');
    }

    const downloadUrl = await clinicalStorageService.getSignedDownloadUrl(doc.storagePath, 60);
    return {
      downloadUrl,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
    };
  }

  async getPatientPortalOverview(
    organizationId: string,
    patientId: string,
    userId: string,
  ): Promise<PatientPortalOverviewDTO> {
    const [appointmentsList, questionnaires, documents, recentMessages] = await Promise.all([
      this.getPatientAppointmentsForPortal(organizationId, patientId),
      this.listQuestionnairesForPatient(organizationId, patientId),
      this.getSharedDocumentsForPortal(organizationId, patientId),
      db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.organizationId, organizationId),
            eq(messages.patientId, patientId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false),
          ),
        ),
    ]);

    const now = new Date();
    const upcoming = appointmentsList.filter(
      (a) => new Date(a.startsAt) >= now && a.status === 'scheduled',
    );
    const pending = questionnaires.filter((q) => q.status === 'assigned');

    return {
      patientId,
      organizationId,
      upcomingAppointmentsCount: upcoming.length,
      pendingQuestionnairesCount: pending.length,
      sharedDocumentsCount: documents.length,
      recentMessagesCount: Number(recentMessages[0]?.count || 0),
      nextAppointment: upcoming[0] || null,
    };
  }

  // ==========================================
  // PATIENT QUESTIONNAIRES
  // ==========================================

  async assignQuestionnaire(
    organizationId: string,
    practitionerId: string,
    input: {
      patientId: string;
      templateId: string;
      careEpisodeId?: string | null;
      dueAt?: string | null;
    },
  ): Promise<PatientQuestionnaireAssignmentDTO> {
    // 1. Verify template exists, belongs to practitioner, and is active
    const [template] = await db
      .select()
      .from(clinicalFormTemplates)
      .where(
        and(
          eq(clinicalFormTemplates.id, input.templateId),
          eq(clinicalFormTemplates.organizationId, organizationId),
          eq(clinicalFormTemplates.practitionerId, practitionerId),
          eq(clinicalFormTemplates.isActive, true),
        ),
      );

    if (!template) {
      throw new AppError(
        'Modèle de formulaire introuvable ou inactif pour ce praticien',
        404,
        'FORM_TEMPLATE_NOT_FOUND',
      );
    }

    // 2. If careEpisodeId provided: verify ownership
    if (input.careEpisodeId) {
      const [episode] = await db
        .select()
        .from(careEpisodes)
        .where(
          and(
            eq(careEpisodes.id, input.careEpisodeId),
            eq(careEpisodes.organizationId, organizationId),
            eq(careEpisodes.patientId, input.patientId),
            eq(careEpisodes.practitionerId, practitionerId),
          ),
        );

      if (!episode) {
        throw new AppError(
          'Épisode de soins introuvable pour ce patient et praticien',
          404,
          'CARE_EPISODE_NOT_FOUND',
        );
      }
    }

    const now = new Date();
    const assignmentId = randomUUID();

    const [created] = await db
      .insert(patientQuestionnaireAssignments)
      .values({
        id: assignmentId,
        organizationId,
        patientId: input.patientId,
        practitionerId,
        templateId: input.templateId,
        careEpisodeId: input.careEpisodeId || null,
        status: 'assigned',
        answersJson: {},
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        submittedAt: null,
        clinicalResponseId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapQuestionnaireToDTO(created, template.name, template.kind, template.description);
  }

  async listQuestionnairesForPatient(
    organizationId: string,
    patientId: string,
  ): Promise<PatientQuestionnaireAssignmentDTO[]> {
    const rows = await db
      .select({
        assignment: patientQuestionnaireAssignments,
        template: clinicalFormTemplates,
      })
      .from(patientQuestionnaireAssignments)
      .leftJoin(
        clinicalFormTemplates,
        and(
          eq(clinicalFormTemplates.id, patientQuestionnaireAssignments.templateId),
          eq(clinicalFormTemplates.organizationId, patientQuestionnaireAssignments.organizationId),
        ),
      )
      .where(
        and(
          eq(patientQuestionnaireAssignments.organizationId, organizationId),
          eq(patientQuestionnaireAssignments.patientId, patientId),
        ),
      )
      .orderBy(desc(patientQuestionnaireAssignments.createdAt));

    return rows.map(({ assignment, template }) =>
      this.mapQuestionnaireToDTO(
        assignment,
        template?.name,
        template?.kind,
        template?.description,
        template?.schemaJson,
      ),
    );
  }

  async listQuestionnairesForPractitioner(
    organizationId: string,
    practitionerId: string,
    patientId: string,
  ): Promise<PatientQuestionnaireAssignmentDTO[]> {
    return this.listQuestionnairesForPatient(organizationId, patientId);
  }

  async listQuestionnairesForPortalUser(
    accessiblePatientIds: string[],
  ): Promise<PatientQuestionnaireAssignmentDTO[]> {
    if (accessiblePatientIds.length === 0) return [];

    const rows = await db
      .select({
        assignment: patientQuestionnaireAssignments,
        template: clinicalFormTemplates,
      })
      .from(patientQuestionnaireAssignments)
      .innerJoin(
        clinicalFormTemplates,
        and(
          eq(clinicalFormTemplates.id, patientQuestionnaireAssignments.templateId),
          eq(clinicalFormTemplates.organizationId, patientQuestionnaireAssignments.organizationId),
        ),
      )
      .where(inArray(patientQuestionnaireAssignments.patientId, accessiblePatientIds))
      .orderBy(desc(patientQuestionnaireAssignments.createdAt));

    return rows.map(({ assignment, template }) =>
      this.mapQuestionnaireToDTO(
        assignment,
        template.name,
        template.kind,
        template.description,
        template.schemaJson,
      ),
    );
  }

  async getQuestionnaireAssignment(
    assignmentId: string,
    accessiblePatientIds: string[],
  ): Promise<PatientQuestionnaireAssignmentDTO> {
    const [row] = await db
      .select({
        assignment: patientQuestionnaireAssignments,
        template: clinicalFormTemplates,
      })
      .from(patientQuestionnaireAssignments)
      .innerJoin(
        clinicalFormTemplates,
        and(
          eq(clinicalFormTemplates.id, patientQuestionnaireAssignments.templateId),
          eq(clinicalFormTemplates.organizationId, patientQuestionnaireAssignments.organizationId),
        ),
      )
      .where(eq(patientQuestionnaireAssignments.id, assignmentId));

    if (!row || !accessiblePatientIds.includes(row.assignment.patientId)) {
      throw new AppError('Questionnaire introuvable', 404, 'QUESTIONNAIRE_NOT_FOUND');
    }

    return this.mapQuestionnaireToDTO(
      row.assignment,
      row.template.name,
      row.template.kind,
      row.template.description,
      row.template.schemaJson,
    );
  }

  async saveQuestionnaireDraft(
    assignmentId: string,
    accessiblePatientIds: string[],
    answers: ClinicalFormAnswers,
  ): Promise<PatientQuestionnaireAssignmentDTO> {
    const [existing] = await db
      .select()
      .from(patientQuestionnaireAssignments)
      .where(eq(patientQuestionnaireAssignments.id, assignmentId));

    if (!existing || !accessiblePatientIds.includes(existing.patientId)) {
      throw new AppError('Questionnaire introuvable', 404, 'QUESTIONNAIRE_NOT_FOUND');
    }

    if (existing.status !== 'assigned') {
      throw new AppError(
        'Ce questionnaire ne peut plus être modifié (statut : ' + existing.status + ')',
        400,
        'QUESTIONNAIRE_ALREADY_PROCESSED',
      );
    }

    const [updated] = await db
      .update(patientQuestionnaireAssignments)
      .set({
        answersJson: answers,
        updatedAt: new Date(),
      })
      .where(eq(patientQuestionnaireAssignments.id, assignmentId))
      .returning();

    return this.mapQuestionnaireToDTO(updated);
  }

  async submitQuestionnaire(
    assignmentId: string,
    accessiblePatientIds: string[],
    answers: ClinicalFormAnswers,
  ): Promise<PatientQuestionnaireAssignmentDTO> {
    const [row] = await db
      .select({
        assignment: patientQuestionnaireAssignments,
        template: clinicalFormTemplates,
      })
      .from(patientQuestionnaireAssignments)
      .innerJoin(
        clinicalFormTemplates,
        and(
          eq(clinicalFormTemplates.id, patientQuestionnaireAssignments.templateId),
          eq(clinicalFormTemplates.organizationId, patientQuestionnaireAssignments.organizationId),
        ),
      )
      .where(eq(patientQuestionnaireAssignments.id, assignmentId));

    if (!row || !accessiblePatientIds.includes(row.assignment.patientId)) {
      throw new AppError('Questionnaire introuvable', 404, 'QUESTIONNAIRE_NOT_FOUND');
    }

    const { assignment, template } = row;

    // Idempotency: if already submitted, return it
    if (assignment.status === 'submitted') {
      return this.mapQuestionnaireToDTO(
        assignment,
        template.name,
        template.kind,
        template.description,
        template.schemaJson,
      );
    }

    if (assignment.status === 'cancelled') {
      throw new AppError('Ce questionnaire a été annulé', 400, 'QUESTIONNAIRE_CANCELLED');
    }

    // Validate answers against server template schema
    const schema = template.schemaJson;

    if (schema?.fields && Array.isArray(schema.fields)) {
      for (const field of schema.fields) {
        if (field.required) {
          const val = answers[field.id];
          if (val === undefined || val === null || val === '') {
            throw new AppError(
              `Le champ obligatoire "${field.label}" doit être renseigné`,
              400,
              'REQUIRED_FIELD_MISSING',
            );
          }
        }
      }
    }

    const now = new Date();
    const clinicalResponseId = randomUUID();

    // Transactional creation of clinical response and assignment transition
    const updatedAssignment = await db.transaction(async (tx) => {
      // 1. Insert clinical form response under practitioner authority
      await tx.insert(clinicalFormResponses).values({
        id: clinicalResponseId,
        organizationId: assignment.organizationId,
        patientId: assignment.patientId,
        practitionerId: assignment.practitionerId,
        templateId: assignment.templateId,
        careEpisodeId: assignment.careEpisodeId,
        encounterId: null,
        status: 'draft',
        answersJson: answers,
        finalizedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      // 2. Mark assignment as submitted
      const [res] = await tx
        .update(patientQuestionnaireAssignments)
        .set({
          status: 'submitted',
          answersJson: answers,
          submittedAt: now,
          clinicalResponseId,
          updatedAt: now,
        })
        .where(eq(patientQuestionnaireAssignments.id, assignment.id))
        .returning();

      return res;
    });

    return this.mapQuestionnaireToDTO(
      updatedAssignment,
      template.name,
      template.kind,
      template.description,
      template.schemaJson,
    );
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private mapPortalAccessToDTO(row: typeof patientPortalAccess.$inferSelect): PatientPortalAccessDTO {
    return {
      id: row.id,
      organizationId: row.organizationId,
      patientId: row.patientId,
      userId: row.userId,
      accessType: row.accessType as 'patient' | 'representative',
      representativeId: row.representativeId,
      isActive: row.isActive,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapQuestionnaireToDTO(
    row: typeof patientQuestionnaireAssignments.$inferSelect,
    templateName?: string,
    templateKind?: string,
    templateDescription?: string | null,
    templateSchemaJson?: ClinicalFormTemplateSchema,
  ): PatientQuestionnaireAssignmentDTO {
    return {
      id: row.id,
      organizationId: row.organizationId,
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      templateId: row.templateId,
      careEpisodeId: row.careEpisodeId,
      status: row.status as 'assigned' | 'submitted' | 'cancelled',
      answersJson: row.answersJson,
      answers: row.answersJson,
      dueAt: row.dueAt ? row.dueAt.toISOString() : null,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      clinicalResponseId: row.clinicalResponseId,
      templateName,
      templateKind: templateKind as PatientQuestionnaireAssignmentDTO['templateKind'],
      templateDescription: templateDescription || undefined,
      templateSchema: templateSchemaJson,
      templateSchemaJson,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export const patientPortalService = new PatientPortalService();
