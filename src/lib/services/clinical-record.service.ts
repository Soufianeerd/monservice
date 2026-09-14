import { db } from '@/lib/db/server';
import {
  careEpisodes,
  clinicalEncounters,
  clinicalNotes,
  clinicalDocuments,
  clinicalFormTemplates,
  clinicalFormResponses,
  clinicalMeasurements,
  patientProfiles,
  appointments,
  appointmentTypes,
} from '@/lib/db/schema';
import { eq, and, desc, asc, lte, notInArray, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AppError } from '@/lib/errors';
import type {
  CareEpisodeDTO,
  ClinicalEncounterDTO,
  ClinicalNoteDTO,
  ClinicalDocumentDTO,
  ClinicalFormTemplateDTO,
  ClinicalFormResponseDTO,
  ClinicalMeasurementDTO,
  ClinicalTimelineItem,
  ClinicalEncounterWithNotesDTO,
  CareEpisodeDetailDTO,
  EligibleAppointmentDTO,
  CreateCareEpisodeInput,
  CreateClinicalEncounterInput,
  CreateClinicalNoteInput,
  CreateClinicalDocumentMetadataInput,
  UpdateClinicalDocumentInput,
  CreateClinicalFormTemplateInput,
  UpdateClinicalFormTemplateInput,
  CreateClinicalFormResponseInput,
  UpdateDraftClinicalFormResponseInput,
  CreateClinicalMeasurementInput,
  ClinicalFormTemplateSchema,
  ClinicalFormAnswers,
} from '@/lib/clinical/types';
import { validateDocumentFile } from '@/lib/clinical/documents';
import {
  validateFormTemplateSchema,
  validateFormAnswersAgainstSchema,
  isValidFormKind,
} from '@/lib/clinical/forms';
import { validateMeasurementInput } from '@/lib/clinical/measurements';
import { buildClinicalTimeline } from '@/lib/clinical/timeline';

export class ClinicalRecordService {
  /**
   * Vérifie l'existence d'un patient au sein de l'organisation.
   */
  private async getPatientOrThrow(
    organizationId: string,
    patientId: string,
    requireActive = false,
  ) {
    const [patient] = await db
      .select({
        id: patientProfiles.id,
        organizationId: patientProfiles.organizationId,
        isActive: patientProfiles.isActive,
      })
      .from(patientProfiles)
      .where(
        and(
          eq(patientProfiles.id, patientId),
          eq(patientProfiles.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!patient) {
      throw new AppError('Patient introuvable', 404, 'PATIENT_NOT_FOUND');
    }

    if (requireActive && !patient.isActive) {
      throw new AppError('Patient inactif', 400, 'PATIENT_INACTIVE');
    }

    return patient;
  }

  /**
   * Liste les épisodes de prise en charge d'un patient pour un praticien.
   */
  async listCareEpisodes(
    organizationId: string,
    patientId: string,
    practitionerId: string,
  ): Promise<CareEpisodeDTO[]> {
    await this.getPatientOrThrow(organizationId, patientId);

    const rows = await db
      .select({
        id: careEpisodes.id,
        organizationId: careEpisodes.organizationId,
        patientId: careEpisodes.patientId,
        practitionerId: careEpisodes.practitionerId,
        title: careEpisodes.title,
        status: careEpisodes.status,
        startedAt: careEpisodes.startedAt,
        closedAt: careEpisodes.closedAt,
        createdAt: careEpisodes.createdAt,
        updatedAt: careEpisodes.updatedAt,
      })
      .from(careEpisodes)
      .where(
        and(
          eq(careEpisodes.organizationId, organizationId),
          eq(careEpisodes.patientId, patientId),
          eq(careEpisodes.practitionerId, practitionerId),
        ),
      )
      .orderBy(desc(careEpisodes.startedAt), asc(careEpisodes.id));

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      patientId: r.patientId,
      practitionerId: r.practitionerId,
      title: r.title,
      status: r.status as 'active' | 'closed',
      startedAt: new Date(r.startedAt).toISOString(),
      closedAt: r.closedAt ? new Date(r.closedAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));
  }

  /**
   * Récupère le détail d'un épisode avec ses séances et notes associées.
   */
  async getCareEpisodeDetail(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    episodeId: string,
  ): Promise<CareEpisodeDetailDTO> {
    await this.getPatientOrThrow(organizationId, patientId);

    const [episode] = await db
      .select({
        id: careEpisodes.id,
        organizationId: careEpisodes.organizationId,
        patientId: careEpisodes.patientId,
        practitionerId: careEpisodes.practitionerId,
        title: careEpisodes.title,
        status: careEpisodes.status,
        startedAt: careEpisodes.startedAt,
        closedAt: careEpisodes.closedAt,
        createdAt: careEpisodes.createdAt,
        updatedAt: careEpisodes.updatedAt,
      })
      .from(careEpisodes)
      .where(
        and(
          eq(careEpisodes.id, episodeId),
          eq(careEpisodes.organizationId, organizationId),
          eq(careEpisodes.patientId, patientId),
          eq(careEpisodes.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!episode) {
      throw new AppError('Épisode de prise en charge introuvable', 404, 'CARE_EPISODE_NOT_FOUND');
    }

    const encounters = await this.listClinicalEncounters(
      organizationId,
      patientId,
      practitionerId,
      episodeId,
    );

    return {
      id: episode.id,
      organizationId: episode.organizationId,
      patientId: episode.patientId,
      practitionerId: episode.practitionerId,
      title: episode.title,
      status: episode.status as 'active' | 'closed',
      startedAt: new Date(episode.startedAt).toISOString(),
      closedAt: episode.closedAt ? new Date(episode.closedAt).toISOString() : null,
      createdAt: new Date(episode.createdAt).toISOString(),
      updatedAt: new Date(episode.updatedAt).toISOString(),
      encounters,
    };
  }

  /**
   * Crée un nouvel épisode de prise en charge.
   */
  async createCareEpisode(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    input: CreateCareEpisodeInput,
  ): Promise<CareEpisodeDTO> {
    await this.getPatientOrThrow(organizationId, patientId, true);

    const id = randomUUID();
    const title = input.title?.trim() ? input.title.trim() : null;

    const [created] = await db
      .insert(careEpisodes)
      .values({
        id,
        organizationId,
        patientId,
        practitionerId,
        title,
        status: 'active',
      })
      .returning({
        id: careEpisodes.id,
        organizationId: careEpisodes.organizationId,
        patientId: careEpisodes.patientId,
        practitionerId: careEpisodes.practitionerId,
        title: careEpisodes.title,
        status: careEpisodes.status,
        startedAt: careEpisodes.startedAt,
        closedAt: careEpisodes.closedAt,
        createdAt: careEpisodes.createdAt,
        updatedAt: careEpisodes.updatedAt,
      });

    if (!created) {
      throw new AppError('Échec de création de l’épisode de prise en charge', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      patientId: created.patientId,
      practitionerId: created.practitionerId,
      title: created.title,
      status: created.status as 'active' | 'closed',
      startedAt: new Date(created.startedAt).toISOString(),
      closedAt: created.closedAt ? new Date(created.closedAt).toISOString() : null,
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  /**
   * Clôture un épisode de prise en charge s'il ne contient pas de brouillon.
   */
  async closeCareEpisode(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    episodeId: string,
  ): Promise<CareEpisodeDTO> {
    await this.getPatientOrThrow(organizationId, patientId);

    const [episode] = await db
      .select({
        id: careEpisodes.id,
        status: careEpisodes.status,
      })
      .from(careEpisodes)
      .where(
        and(
          eq(careEpisodes.id, episodeId),
          eq(careEpisodes.organizationId, organizationId),
          eq(careEpisodes.patientId, patientId),
          eq(careEpisodes.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!episode) {
      throw new AppError('Épisode introuvable', 404, 'CARE_EPISODE_NOT_FOUND');
    }

    if (episode.status === 'closed') {
      throw new AppError('Épisode déjà clôturé', 400, 'CARE_EPISODE_CLOSED');
    }

    // Vérifier s'il existe des notes en brouillon sous cet épisode
    const draftNotes = await db
      .select({ id: clinicalNotes.id })
      .from(clinicalNotes)
      .innerJoin(
        clinicalEncounters,
        and(
          eq(clinicalNotes.encounterId, clinicalEncounters.id),
          eq(clinicalNotes.organizationId, clinicalEncounters.organizationId),
        ),
      )
      .where(
        and(
          eq(clinicalEncounters.careEpisodeId, episodeId),
          eq(clinicalEncounters.organizationId, organizationId),
          eq(clinicalNotes.status, 'draft'),
        ),
      )
      .limit(1);

    if (draftNotes.length > 0) {
      throw new AppError(
        'Impossible de clôturer un épisode contenant des notes brouillon',
        400,
        'CARE_EPISODE_HAS_DRAFT_NOTES',
      );
    }

    const [updated] = await db
      .update(careEpisodes)
      .set({
        status: 'closed',
        closedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(careEpisodes.id, episodeId),
          eq(careEpisodes.organizationId, organizationId),
          eq(careEpisodes.patientId, patientId),
          eq(careEpisodes.practitionerId, practitionerId),
        ),
      )
      .returning({
        id: careEpisodes.id,
        organizationId: careEpisodes.organizationId,
        patientId: careEpisodes.patientId,
        practitionerId: careEpisodes.practitionerId,
        title: careEpisodes.title,
        status: careEpisodes.status,
        startedAt: careEpisodes.startedAt,
        closedAt: careEpisodes.closedAt,
        createdAt: careEpisodes.createdAt,
        updatedAt: careEpisodes.updatedAt,
      });

    if (!updated) {
      throw new AppError('Échec de clôture de l’épisode', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      practitionerId: updated.practitionerId,
      title: updated.title,
      status: updated.status as 'active' | 'closed',
      startedAt: new Date(updated.startedAt).toISOString(),
      closedAt: updated.closedAt ? new Date(updated.closedAt).toISOString() : null,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Liste les séances cliniques d'un épisode avec leurs notes associées.
   */
  async listClinicalEncounters(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    episodeId: string,
  ): Promise<ClinicalEncounterWithNotesDTO[]> {
    const encounterRows = await db
      .select({
        id: clinicalEncounters.id,
        organizationId: clinicalEncounters.organizationId,
        careEpisodeId: clinicalEncounters.careEpisodeId,
        patientId: clinicalEncounters.patientId,
        practitionerId: clinicalEncounters.practitionerId,
        appointmentId: clinicalEncounters.appointmentId,
        occurredAt: clinicalEncounters.occurredAt,
        createdAt: clinicalEncounters.createdAt,
        updatedAt: clinicalEncounters.updatedAt,
      })
      .from(clinicalEncounters)
      .where(
        and(
          eq(clinicalEncounters.careEpisodeId, episodeId),
          eq(clinicalEncounters.organizationId, organizationId),
          eq(clinicalEncounters.patientId, patientId),
          eq(clinicalEncounters.practitionerId, practitionerId),
        ),
      )
      .orderBy(desc(clinicalEncounters.occurredAt), asc(clinicalEncounters.id));

    if (encounterRows.length === 0) {
      return [];
    }

    const encounterIds = encounterRows.map((e) => e.id);
    const noteRows = await db
      .select({
        id: clinicalNotes.id,
        organizationId: clinicalNotes.organizationId,
        encounterId: clinicalNotes.encounterId,
        patientId: clinicalNotes.patientId,
        authorPractitionerId: clinicalNotes.authorPractitionerId,
        content: clinicalNotes.content,
        status: clinicalNotes.status,
        finalizedAt: clinicalNotes.finalizedAt,
        createdAt: clinicalNotes.createdAt,
        updatedAt: clinicalNotes.updatedAt,
      })
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
          inArray(clinicalNotes.encounterId, encounterIds),
        ),
      )
      .orderBy(asc(clinicalNotes.createdAt), asc(clinicalNotes.id));

    const notesByEncounter = new Map<string, ClinicalNoteDTO[]>();
    for (const note of noteRows) {
      const list = notesByEncounter.get(note.encounterId) || [];
      list.push({
        id: note.id,
        organizationId: note.organizationId,
        encounterId: note.encounterId,
        patientId: note.patientId,
        authorPractitionerId: note.authorPractitionerId,
        content: note.content,
        status: note.status as 'draft' | 'finalized',
        finalizedAt: note.finalizedAt ? new Date(note.finalizedAt).toISOString() : null,
        createdAt: new Date(note.createdAt).toISOString(),
        updatedAt: new Date(note.updatedAt).toISOString(),
      });
      notesByEncounter.set(note.encounterId, list);
    }

    return encounterRows.map((e) => ({
      id: e.id,
      organizationId: e.organizationId,
      careEpisodeId: e.careEpisodeId,
      patientId: e.patientId,
      practitionerId: e.practitionerId,
      appointmentId: e.appointmentId,
      occurredAt: new Date(e.occurredAt).toISOString(),
      createdAt: new Date(e.createdAt).toISOString(),
      updatedAt: new Date(e.updatedAt).toISOString(),
      notes: notesByEncounter.get(e.id) || [],
    }));
  }

  /**
   * Liste les rendez-vous éligibles à être associés à une nouvelle séance clinique.
   */
  async listEligibleAppointmentsForEncounter(
    organizationId: string,
    patientId: string,
    practitionerId: string,
  ): Promise<EligibleAppointmentDTO[]> {
    // 1. Récupérer les IDs de rendez-vous déjà liés à une séance clinique
    const linkedApptRows = await db
      .select({ appointmentId: clinicalEncounters.appointmentId })
      .from(clinicalEncounters)
      .where(
        and(
          eq(clinicalEncounters.organizationId, organizationId),
          sql`${clinicalEncounters.appointmentId} IS NOT NULL`,
        ),
      );

    const linkedIds = linkedApptRows
      .map((r) => r.appointmentId)
      .filter((id): id is string => Boolean(id));

    // 2. Sélectionner les rendez-vous passés et scheduled
    const conditions = [
      eq(appointments.organizationId, organizationId),
      eq(appointments.patientId, patientId),
      eq(appointments.practitionerId, practitionerId),
      eq(appointments.status, 'scheduled'),
      lte(appointments.startsAt, sql`now()`),
    ];

    if (linkedIds.length > 0) {
      conditions.push(notInArray(appointments.id, linkedIds));
    }

    const rows = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        appointmentTypeId: appointments.appointmentTypeId,
        appointmentTypeName: appointmentTypes.name,
      })
      .from(appointments)
      .innerJoin(
        appointmentTypes,
        and(
          eq(appointments.appointmentTypeId, appointmentTypes.id),
          eq(appointments.organizationId, appointmentTypes.organizationId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(appointments.startsAt), asc(appointments.id));

    return rows.map((r) => ({
      id: r.id,
      startsAt: new Date(r.startsAt).toISOString(),
      endsAt: new Date(r.endsAt).toISOString(),
      status: r.status,
      appointmentTypeId: r.appointmentTypeId,
      appointmentTypeName: r.appointmentTypeName,
    }));
  }

  /**
   * Crée une séance clinique (encounter) au sein d'un épisode actif.
   */
  async createClinicalEncounter(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    input: CreateClinicalEncounterInput,
  ): Promise<ClinicalEncounterDTO> {
    await this.getPatientOrThrow(organizationId, patientId, true);

    // Vérifier l'épisode
    const [episode] = await db
      .select({ id: careEpisodes.id, status: careEpisodes.status })
      .from(careEpisodes)
      .where(
        and(
          eq(careEpisodes.id, input.careEpisodeId),
          eq(careEpisodes.organizationId, organizationId),
          eq(careEpisodes.patientId, patientId),
          eq(careEpisodes.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!episode || episode.status !== 'active') {
      throw new AppError(
        'Épisode de prise en charge fermé ou introuvable',
        400,
        'CARE_EPISODE_CLOSED',
      );
    }

    const occurredDate = new Date(input.occurredAt);
    if (isNaN(occurredDate.getTime()) || occurredDate.getTime() > Date.now() + 60000) {
      throw new AppError(
        'La séance clinique ne peut pas se dérouler dans le futur',
        400,
        'FUTURE_CLINICAL_ENCOUNTER',
      );
    }

    // Vérifier le rendez-vous lié si fourni
    if (input.appointmentId) {
      const [appt] = await db
        .select({
          id: appointments.id,
          startsAt: appointments.startsAt,
          status: appointments.status,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.organizationId, organizationId),
            eq(appointments.patientId, patientId),
            eq(appointments.practitionerId, practitionerId),
          ),
        )
        .limit(1);

      if (!appt || appt.status !== 'scheduled' || new Date(appt.startsAt).getTime() > Date.now() + 60000) {
        throw new AppError(
          'Rendez-vous inéligible pour cette séance clinique',
          400,
          'APPOINTMENT_NOT_ELIGIBLE',
        );
      }

      // Vérifier que le rendez-vous n'est pas déjà associé
      const [existingEncounter] = await db
        .select({ id: clinicalEncounters.id })
        .from(clinicalEncounters)
        .where(
          and(
            eq(clinicalEncounters.organizationId, organizationId),
            eq(clinicalEncounters.appointmentId, input.appointmentId),
          ),
        )
        .limit(1);

      if (existingEncounter) {
        throw new AppError(
          'Ce rendez-vous est déjà associé à une autre séance clinique',
          400,
          'APPOINTMENT_NOT_ELIGIBLE',
        );
      }
    }

    const encounterId = randomUUID();
    const [created] = await db
      .insert(clinicalEncounters)
      .values({
        id: encounterId,
        organizationId,
        careEpisodeId: input.careEpisodeId,
        patientId,
        practitionerId,
        appointmentId: input.appointmentId || null,
        occurredAt: occurredDate,
      })
      .returning({
        id: clinicalEncounters.id,
        organizationId: clinicalEncounters.organizationId,
        careEpisodeId: clinicalEncounters.careEpisodeId,
        patientId: clinicalEncounters.patientId,
        practitionerId: clinicalEncounters.practitionerId,
        appointmentId: clinicalEncounters.appointmentId,
        occurredAt: clinicalEncounters.occurredAt,
        createdAt: clinicalEncounters.createdAt,
        updatedAt: clinicalEncounters.updatedAt,
      });

    if (!created) {
      throw new AppError('Échec de la création de la séance clinique', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      careEpisodeId: created.careEpisodeId,
      patientId: created.patientId,
      practitionerId: created.practitionerId,
      appointmentId: created.appointmentId,
      occurredAt: new Date(created.occurredAt).toISOString(),
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  /**
   * Crée une note clinique en statut brouillon.
   */
  async createClinicalNote(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    input: CreateClinicalNoteInput,
  ): Promise<ClinicalNoteDTO> {
    await this.getPatientOrThrow(organizationId, patientId);

    // Vérifier l'encounter et l'état de l'épisode parent
    const [encounter] = await db
      .select({
        id: clinicalEncounters.id,
        careEpisodeId: clinicalEncounters.careEpisodeId,
        episodeStatus: careEpisodes.status,
      })
      .from(clinicalEncounters)
      .innerJoin(
        careEpisodes,
        and(
          eq(clinicalEncounters.careEpisodeId, careEpisodes.id),
          eq(clinicalEncounters.organizationId, careEpisodes.organizationId),
        ),
      )
      .where(
        and(
          eq(clinicalEncounters.id, input.encounterId),
          eq(clinicalEncounters.organizationId, organizationId),
          eq(clinicalEncounters.patientId, patientId),
          eq(clinicalEncounters.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!encounter) {
      throw new AppError('Séance clinique introuvable', 404, 'CLINICAL_ENCOUNTER_NOT_FOUND');
    }

    if (encounter.episodeStatus !== 'active') {
      throw new AppError('Épisode de prise en charge clôturé', 400, 'CARE_EPISODE_CLOSED');
    }

    const noteId = randomUUID();
    const [created] = await db
      .insert(clinicalNotes)
      .values({
        id: noteId,
        organizationId,
        encounterId: input.encounterId,
        patientId,
        authorPractitionerId: practitionerId,
        content: input.content.trim(),
        status: 'draft',
      })
      .returning({
        id: clinicalNotes.id,
        organizationId: clinicalNotes.organizationId,
        encounterId: clinicalNotes.encounterId,
        patientId: clinicalNotes.patientId,
        authorPractitionerId: clinicalNotes.authorPractitionerId,
        content: clinicalNotes.content,
        status: clinicalNotes.status,
        finalizedAt: clinicalNotes.finalizedAt,
        createdAt: clinicalNotes.createdAt,
        updatedAt: clinicalNotes.updatedAt,
      });

    if (!created) {
      throw new AppError('Échec de la création de la note clinique', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      encounterId: created.encounterId,
      patientId: created.patientId,
      authorPractitionerId: created.authorPractitionerId,
      content: created.content,
      status: created.status as 'draft' | 'finalized',
      finalizedAt: created.finalizedAt ? new Date(created.finalizedAt).toISOString() : null,
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  /**
   * Met à jour le contenu d'une note clinique en statut brouillon.
   */
  async updateDraftClinicalNote(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    noteId: string,
    content: string,
  ): Promise<ClinicalNoteDTO> {
    const [note] = await db
      .select({
        id: clinicalNotes.id,
        status: clinicalNotes.status,
      })
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.id, noteId),
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!note) {
      throw new AppError('Note clinique introuvable', 404, 'CLINICAL_NOTE_NOT_FOUND');
    }

    if (note.status === 'finalized') {
      throw new AppError(
        'Une note finalisée est immuable et ne peut être modifiée',
        400,
        'CLINICAL_NOTE_FINALIZED',
      );
    }

    const [updated] = await db
      .update(clinicalNotes)
      .set({
        content: content.trim(),
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(clinicalNotes.id, noteId),
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
        ),
      )
      .returning({
        id: clinicalNotes.id,
        organizationId: clinicalNotes.organizationId,
        encounterId: clinicalNotes.encounterId,
        patientId: clinicalNotes.patientId,
        authorPractitionerId: clinicalNotes.authorPractitionerId,
        content: clinicalNotes.content,
        status: clinicalNotes.status,
        finalizedAt: clinicalNotes.finalizedAt,
        createdAt: clinicalNotes.createdAt,
        updatedAt: clinicalNotes.updatedAt,
      });

    if (!updated) {
      throw new AppError('Échec de la mise à jour de la note', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      encounterId: updated.encounterId,
      patientId: updated.patientId,
      authorPractitionerId: updated.authorPractitionerId,
      content: updated.content,
      status: updated.status as 'draft' | 'finalized',
      finalizedAt: updated.finalizedAt ? new Date(updated.finalizedAt).toISOString() : null,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Finalise une note clinique (irréversible).
   */
  async finalizeClinicalNote(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    noteId: string,
  ): Promise<ClinicalNoteDTO> {
    const [note] = await db
      .select({
        id: clinicalNotes.id,
        status: clinicalNotes.status,
      })
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.id, noteId),
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!note) {
      throw new AppError('Note clinique introuvable', 404, 'CLINICAL_NOTE_NOT_FOUND');
    }

    if (note.status === 'finalized') {
      const [finalized] = await db
        .select({
          id: clinicalNotes.id,
          organizationId: clinicalNotes.organizationId,
          encounterId: clinicalNotes.encounterId,
          patientId: clinicalNotes.patientId,
          authorPractitionerId: clinicalNotes.authorPractitionerId,
          content: clinicalNotes.content,
          status: clinicalNotes.status,
          finalizedAt: clinicalNotes.finalizedAt,
          createdAt: clinicalNotes.createdAt,
          updatedAt: clinicalNotes.updatedAt,
        })
        .from(clinicalNotes)
        .where(eq(clinicalNotes.id, noteId))
        .limit(1);

      return {
        id: finalized!.id,
        organizationId: finalized!.organizationId,
        encounterId: finalized!.encounterId,
        patientId: finalized!.patientId,
        authorPractitionerId: finalized!.authorPractitionerId,
        content: finalized!.content,
        status: 'finalized',
        finalizedAt: finalized!.finalizedAt ? new Date(finalized!.finalizedAt).toISOString() : null,
        createdAt: new Date(finalized!.createdAt).toISOString(),
        updatedAt: new Date(finalized!.updatedAt).toISOString(),
      };
    }

    const [updated] = await db
      .update(clinicalNotes)
      .set({
        status: 'finalized',
        finalizedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(clinicalNotes.id, noteId),
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
        ),
      )
      .returning({
        id: clinicalNotes.id,
        organizationId: clinicalNotes.organizationId,
        encounterId: clinicalNotes.encounterId,
        patientId: clinicalNotes.patientId,
        authorPractitionerId: clinicalNotes.authorPractitionerId,
        content: clinicalNotes.content,
        status: clinicalNotes.status,
        finalizedAt: clinicalNotes.finalizedAt,
        createdAt: clinicalNotes.createdAt,
        updatedAt: clinicalNotes.updatedAt,
      });

    if (!updated) {
      throw new AppError('Échec de finalisation de la note', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      encounterId: updated.encounterId,
      patientId: updated.patientId,
      authorPractitionerId: updated.authorPractitionerId,
      content: updated.content,
      status: updated.status as 'draft' | 'finalized',
      finalizedAt: updated.finalizedAt ? new Date(updated.finalizedAt).toISOString() : null,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  // ==========================================
  // SESSION 12 : CLINICAL DOCUMENTS
  // ==========================================

  /**
   * Valide la cohérence des liens cliniques (épisode et séance).
   * Si careEpisodeId ET encounterId sont fournis, vérifie que l'encounter appartient bien à ce careEpisode.
   * Lève une AppError avec le code CLINICAL_CONTEXT_MISMATCH en cas d'incohérence.
   */
  async validateClinicalContextLinks(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    careEpisodeId?: string | null,
    encounterId?: string | null,
  ): Promise<void> {
    if (careEpisodeId) {
      const [ep] = await db
        .select({ id: careEpisodes.id })
        .from(careEpisodes)
        .where(
          and(
            eq(careEpisodes.id, careEpisodeId),
            eq(careEpisodes.organizationId, organizationId),
            eq(careEpisodes.patientId, patientId),
            eq(careEpisodes.practitionerId, practitionerId),
          ),
        )
        .limit(1);

      if (!ep) {
        throw new AppError('Épisode de soins introuvable ou non associé', 404, 'EPISODE_NOT_FOUND');
      }
    }

    if (encounterId) {
      const [enc] = await db
        .select({ id: clinicalEncounters.id, careEpisodeId: clinicalEncounters.careEpisodeId })
        .from(clinicalEncounters)
        .where(
          and(
            eq(clinicalEncounters.id, encounterId),
            eq(clinicalEncounters.organizationId, organizationId),
            eq(clinicalEncounters.patientId, patientId),
            eq(clinicalEncounters.practitionerId, practitionerId),
          ),
        )
        .limit(1);

      if (!enc) {
        throw new AppError('Séance clinique introuvable ou non associée', 404, 'ENCOUNTER_NOT_FOUND');
      }

      if (careEpisodeId && enc.careEpisodeId !== careEpisodeId) {
        throw new AppError(
          'La séance clinique n’appartient pas à l’épisode de soins spécifié',
          400,
          'CLINICAL_CONTEXT_MISMATCH',
        );
      }
    }
  }

  /**
   * Enregistre les métadonnées d'un document clinique après téléversement sécurisé.
   */
  async createClinicalDocumentMetadata(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    input: CreateClinicalDocumentMetadataInput,
  ): Promise<ClinicalDocumentDTO> {
    await this.getPatientOrThrow(organizationId, patientId);

    const validated = validateDocumentFile(
      input.mimeType,
      input.sizeBytes,
      input.title,
      input.category,
    );

    await this.validateClinicalContextLinks(
      organizationId,
      patientId,
      practitionerId,
      input.careEpisodeId,
      input.encounterId,
    );

    const documentId = input.id || randomUUID();

    const [created] = await db
      .insert(clinicalDocuments)
      .values({
        id: documentId,
        organizationId,
        patientId,
        practitionerId,
        careEpisodeId: input.careEpisodeId || null,
        encounterId: input.encounterId || null,
        title: validated.title,
        category: validated.category,
        fileName: input.fileName.trim().slice(0, 255),
        mimeType: validated.mimeType,
        sizeBytes: input.sizeBytes,
        storagePath: input.storagePath,
        patientVisible: input.patientVisible ?? false,
        isArchived: false,
      })
      .returning();

    if (!created) {
      throw new AppError('Échec de la création des métadonnées du document', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      patientId: created.patientId,
      practitionerId: created.practitionerId,
      careEpisodeId: created.careEpisodeId,
      encounterId: created.encounterId,
      title: created.title,
      category: created.category as ClinicalDocumentDTO['category'],
      fileName: created.fileName,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
      storagePath: created.storagePath,
      patientVisible: created.patientVisible ?? false,
      isArchived: created.isArchived,
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  /**
   * Met à jour le titre, la catégorie, la visibilité patient ou l'état d'archivage d'un document clinique.
   */
  async updateClinicalDocument(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    documentId: string,
    input: UpdateClinicalDocumentInput,
  ): Promise<ClinicalDocumentDTO> {
    const [existing] = await db
      .select({ id: clinicalDocuments.id })
      .from(clinicalDocuments)
      .where(
        and(
          eq(clinicalDocuments.id, documentId),
          eq(clinicalDocuments.organizationId, organizationId),
          eq(clinicalDocuments.patientId, patientId),
          eq(clinicalDocuments.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new AppError('Document clinique introuvable', 404, 'DOCUMENT_NOT_FOUND');
    }

    const updatePayload: Partial<typeof clinicalDocuments.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed || trimmed.length > 200) {
        throw new AppError('Le titre du document doit comporter entre 1 et 200 caractères', 400, 'INVALID_DOCUMENT_TITLE');
      }
      updatePayload.title = trimmed;
    }

    if (input.category !== undefined) {
      updatePayload.category = input.category;
    }

    if (input.patientVisible !== undefined) {
      updatePayload.patientVisible = input.patientVisible;
    }

    if (input.isArchived !== undefined) {
      updatePayload.isArchived = input.isArchived;
    }

    const [updated] = await db
      .update(clinicalDocuments)
      .set(updatePayload)
      .where(
        and(
          eq(clinicalDocuments.id, documentId),
          eq(clinicalDocuments.organizationId, organizationId),
          eq(clinicalDocuments.patientId, patientId),
          eq(clinicalDocuments.practitionerId, practitionerId),
        ),
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec de la mise à jour du document', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      practitionerId: updated.practitionerId,
      careEpisodeId: updated.careEpisodeId,
      encounterId: updated.encounterId,
      title: updated.title,
      category: updated.category as ClinicalDocumentDTO['category'],
      fileName: updated.fileName,
      mimeType: updated.mimeType,
      sizeBytes: updated.sizeBytes,
      storagePath: updated.storagePath,
      patientVisible: updated.patientVisible ?? false,
      isArchived: updated.isArchived,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Modifie la visibilité d'un document pour le portail patient.
   */
  async setDocumentPatientVisible(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    documentId: string,
    patientVisible: boolean,
  ): Promise<ClinicalDocumentDTO> {
    return this.updateClinicalDocument(organizationId, patientId, practitionerId, documentId, {
      patientVisible,
    });
  }

  /**
   * Archive un document clinique (archivage logique).
   */
  async archiveClinicalDocument(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    documentId: string,
  ): Promise<ClinicalDocumentDTO> {
    return this.updateClinicalDocument(organizationId, patientId, practitionerId, documentId, {
      isArchived: true,
    });
  }

  /**
   * Récupère un document clinique individuel.
   */
  async getClinicalDocument(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    documentId: string,
  ): Promise<ClinicalDocumentDTO | null> {
    const [row] = await db
      .select()
      .from(clinicalDocuments)
      .where(
        and(
          eq(clinicalDocuments.id, documentId),
          eq(clinicalDocuments.organizationId, organizationId),
          eq(clinicalDocuments.patientId, patientId),
          eq(clinicalDocuments.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organizationId,
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      careEpisodeId: row.careEpisodeId,
      encounterId: row.encounterId,
      title: row.title,
      category: row.category as ClinicalDocumentDTO['category'],
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      storagePath: row.storagePath,
      patientVisible: row.patientVisible ?? false,
      isArchived: row.isArchived,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /**
   * Liste les documents cliniques d'un patient pour le praticien connecté.
   */
  async listClinicalDocuments(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    options?: { isArchived?: boolean; careEpisodeId?: string },
  ): Promise<ClinicalDocumentDTO[]> {
    await this.getPatientOrThrow(organizationId, patientId);

    const conditions = [
      eq(clinicalDocuments.organizationId, organizationId),
      eq(clinicalDocuments.patientId, patientId),
      eq(clinicalDocuments.practitionerId, practitionerId),
    ];

    if (options?.isArchived !== undefined) {
      conditions.push(eq(clinicalDocuments.isArchived, options.isArchived));
    }

    if (options?.careEpisodeId) {
      conditions.push(eq(clinicalDocuments.careEpisodeId, options.careEpisodeId));
    }

    const rows = await db
      .select()
      .from(clinicalDocuments)
      .where(and(...conditions))
      .orderBy(desc(clinicalDocuments.createdAt), asc(clinicalDocuments.id));

    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      careEpisodeId: row.careEpisodeId,
      encounterId: row.encounterId,
      title: row.title,
      category: row.category as ClinicalDocumentDTO['category'],
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      storagePath: row.storagePath,
      patientVisible: row.patientVisible ?? false,
      isArchived: row.isArchived,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  // ==========================================
  // SESSION 12 : FORM TEMPLATES
  // ==========================================

  /**
   * Crée un template de formulaire clinique pour le praticien connecté.
   */
  async createFormTemplate(
    organizationId: string,
    practitionerId: string,
    input: CreateClinicalFormTemplateInput,
  ): Promise<ClinicalFormTemplateDTO> {
    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length > 200) {
      throw new AppError('Le nom du formulaire doit comporter entre 1 et 200 caractères', 400, 'INVALID_FORM_NAME');
    }

    const validatedSchema = validateFormTemplateSchema(input.schemaJson);

    const templateId = randomUUID();

    const [created] = await db
      .insert(clinicalFormTemplates)
      .values({
        id: templateId,
        organizationId,
        practitionerId,
        name: trimmedName,
        kind: input.kind,
        description: input.description?.trim() || null,
        schemaJson: validatedSchema,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new AppError('Échec de la création du template de formulaire', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      practitionerId: created.practitionerId,
      name: created.name,
      kind: created.kind as ClinicalFormTemplateDTO['kind'],
      description: created.description,
      schemaJson: created.schemaJson,
      isActive: created.isActive,
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  /**
   * Met à jour un template de formulaire existant.
   */
  async updateFormTemplate(
    organizationId: string,
    practitionerId: string,
    templateId: string,
    input: UpdateClinicalFormTemplateInput,
  ): Promise<ClinicalFormTemplateDTO> {
    const [existing] = await db
      .select()
      .from(clinicalFormTemplates)
      .where(
        and(
          eq(clinicalFormTemplates.id, templateId),
          eq(clinicalFormTemplates.organizationId, organizationId),
          eq(clinicalFormTemplates.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new AppError('Template de formulaire introuvable', 404, 'TEMPLATE_NOT_FOUND');
    }

    const updatePayload: Partial<typeof clinicalFormTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed || trimmed.length > 200) {
        throw new AppError('Le nom du formulaire doit comporter entre 1 et 200 caractères', 400, 'INVALID_FORM_NAME');
      }
      updatePayload.name = trimmed;
    }

    if (input.kind !== undefined) {
      if (!isValidFormKind(input.kind)) {
        throw new AppError('Type de formulaire invalide', 400, 'INVALID_FORM_KIND');
      }
      updatePayload.kind = input.kind;
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description ? input.description.trim().slice(0, 1000) : null;
    }

    if (input.schemaJson !== undefined) {
      validateFormTemplateSchema(input.schemaJson);
      updatePayload.schemaJson = input.schemaJson;
    }

    if (input.isActive !== undefined) {
      updatePayload.isActive = Boolean(input.isActive);
    }

    const [updated] = await db
      .update(clinicalFormTemplates)
      .set(updatePayload)
      .where(
        and(
          eq(clinicalFormTemplates.id, templateId),
          eq(clinicalFormTemplates.organizationId, organizationId),
          eq(clinicalFormTemplates.practitionerId, practitionerId),
        ),
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec de la mise à jour du formulaire', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      practitionerId: updated.practitionerId,
      name: updated.name,
      kind: updated.kind as ClinicalFormTemplateDTO['kind'],
      description: updated.description,
      schemaJson: updated.schemaJson,
      isActive: updated.isActive,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Récupère un template de formulaire individuel.
   */
  async getFormTemplate(
    organizationId: string,
    practitionerId: string,
    templateId: string,
  ): Promise<ClinicalFormTemplateDTO | null> {
    const [row] = await db
      .select()
      .from(clinicalFormTemplates)
      .where(
        and(
          eq(clinicalFormTemplates.id, templateId),
          eq(clinicalFormTemplates.organizationId, organizationId),
          eq(clinicalFormTemplates.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organizationId,
      practitionerId: row.practitionerId,
      name: row.name,
      kind: row.kind as ClinicalFormTemplateDTO['kind'],
      description: row.description,
      schemaJson: row.schemaJson,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /**
   * Liste les templates de formulaire du praticien connecté.
   */
  async listFormTemplates(
    organizationId: string,
    practitionerId: string,
    activeOnly = false,
  ): Promise<ClinicalFormTemplateDTO[]> {
    const conditions = [
      eq(clinicalFormTemplates.organizationId, organizationId),
      eq(clinicalFormTemplates.practitionerId, practitionerId),
    ];

    if (activeOnly) {
      conditions.push(eq(clinicalFormTemplates.isActive, true));
    }

    const rows = await db
      .select()
      .from(clinicalFormTemplates)
      .where(and(...conditions))
      .orderBy(asc(clinicalFormTemplates.name), asc(clinicalFormTemplates.id));

    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      practitionerId: row.practitionerId,
      name: row.name,
      kind: row.kind as ClinicalFormTemplateDTO['kind'],
      description: row.description,
      schemaJson: row.schemaJson,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  // ==========================================
  // SESSION 12 : FORM RESPONSES
  // ==========================================

  /**
   * Crée une réponse à un formulaire clinique en mode brouillon (draft).
   */
  async createFormResponse(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    input: CreateClinicalFormResponseInput,
  ): Promise<ClinicalFormResponseDTO> {
    await this.getPatientOrThrow(organizationId, patientId);

    const template = await this.getFormTemplate(organizationId, practitionerId, input.templateId);
    if (!template || !template.isActive) {
      throw new AppError('Template de formulaire introuvable ou inactif', 404, 'TEMPLATE_NOT_FOUND');
    }

    // Valider les réponses partielles contre le schéma
    const validatedAnswers = validateFormAnswersAgainstSchema(template.schemaJson, input.answersJson, false);

    await this.validateClinicalContextLinks(
      organizationId,
      patientId,
      practitionerId,
      input.careEpisodeId,
      input.encounterId,
    );

    const responseId = randomUUID();

    const [created] = await db
      .insert(clinicalFormResponses)
      .values({
        id: responseId,
        organizationId,
        templateId: template.id,
        patientId,
        practitionerId,
        careEpisodeId: input.careEpisodeId || null,
        encounterId: input.encounterId || null,
        answersJson: validatedAnswers,
        status: 'draft',
      })
      .returning();

    if (!created) {
      throw new AppError('Échec de la création de la réponse au formulaire', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      templateId: created.templateId,
      templateName: template.name,
      templateKind: template.kind,
      patientId: created.patientId,
      practitionerId: created.practitionerId,
      careEpisodeId: created.careEpisodeId,
      encounterId: created.encounterId,
      answersJson: created.answersJson as ClinicalFormAnswers,
      status: created.status as ClinicalFormResponseDTO['status'],
      finalizedAt: created.finalizedAt ? new Date(created.finalizedAt).toISOString() : null,
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  /**
   * Met à jour une réponse à un formulaire en mode brouillon (draft).
   */
  async updateDraftFormResponse(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    responseId: string,
    input: UpdateDraftClinicalFormResponseInput,
  ): Promise<ClinicalFormResponseDTO> {
    const [existing] = await db
      .select({
        id: clinicalFormResponses.id,
        templateId: clinicalFormResponses.templateId,
        careEpisodeId: clinicalFormResponses.careEpisodeId,
        encounterId: clinicalFormResponses.encounterId,
        status: clinicalFormResponses.status,
      })
      .from(clinicalFormResponses)
      .where(
        and(
          eq(clinicalFormResponses.id, responseId),
          eq(clinicalFormResponses.organizationId, organizationId),
          eq(clinicalFormResponses.patientId, patientId),
          eq(clinicalFormResponses.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new AppError('Réponse de formulaire introuvable', 404, 'FORM_RESPONSE_NOT_FOUND');
    }

    if (existing.status === 'finalized') {
      throw new AppError('Impossible de modifier une réponse de formulaire finalisée', 400, 'FINALIZED_RESPONSE_IMMUTABLE');
    }

    const template = await this.getFormTemplate(organizationId, practitionerId, existing.templateId);
    if (!template) {
      throw new AppError('Template associé introuvable', 404, 'TEMPLATE_NOT_FOUND');
    }

    const targetEpisodeId = input.careEpisodeId !== undefined ? input.careEpisodeId : existing.careEpisodeId;
    const targetEncounterId = input.encounterId !== undefined ? input.encounterId : existing.encounterId;

    if (input.careEpisodeId !== undefined || input.encounterId !== undefined) {
      await this.validateClinicalContextLinks(
        organizationId,
        patientId,
        practitionerId,
        targetEpisodeId,
        targetEncounterId,
      );
    }

    const validatedAnswers = validateFormAnswersAgainstSchema(template.schemaJson, input.answersJson, false);

    const updatePayload: Partial<typeof clinicalFormResponses.$inferInsert> = {
      answersJson: validatedAnswers,
      updatedAt: new Date(),
    };

    if (input.careEpisodeId !== undefined) {
      updatePayload.careEpisodeId = input.careEpisodeId;
    }

    if (input.encounterId !== undefined) {
      updatePayload.encounterId = input.encounterId;
    }

    const [updated] = await db
      .update(clinicalFormResponses)
      .set(updatePayload)
      .where(
        and(
          eq(clinicalFormResponses.id, responseId),
          eq(clinicalFormResponses.organizationId, organizationId),
          eq(clinicalFormResponses.patientId, patientId),
          eq(clinicalFormResponses.practitionerId, practitionerId),
        ),
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec de mise à jour du formulaire', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      templateId: updated.templateId,
      templateName: template.name,
      templateKind: template.kind,
      patientId: updated.patientId,
      practitionerId: updated.practitionerId,
      careEpisodeId: updated.careEpisodeId,
      encounterId: updated.encounterId,
      answersJson: updated.answersJson as ClinicalFormAnswers,
      status: updated.status as ClinicalFormResponseDTO['status'],
      finalizedAt: updated.finalizedAt ? new Date(updated.finalizedAt).toISOString() : null,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Finalise une réponse de formulaire (verrouillage immuable irréversible).
   */
  async finalizeFormResponse(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    responseId: string,
    answersJson?: ClinicalFormAnswers,
  ): Promise<ClinicalFormResponseDTO> {
    const [existing] = await db
      .select({
        id: clinicalFormResponses.id,
        templateId: clinicalFormResponses.templateId,
        answersJson: clinicalFormResponses.answersJson,
        status: clinicalFormResponses.status,
      })
      .from(clinicalFormResponses)
      .where(
        and(
          eq(clinicalFormResponses.id, responseId),
          eq(clinicalFormResponses.organizationId, organizationId),
          eq(clinicalFormResponses.patientId, patientId),
          eq(clinicalFormResponses.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new AppError('Réponse de formulaire introuvable', 404, 'FORM_RESPONSE_NOT_FOUND');
    }

    const template = await this.getFormTemplate(organizationId, practitionerId, existing.templateId);
    if (!template) {
      throw new AppError('Template associé introuvable', 404, 'TEMPLATE_NOT_FOUND');
    }

    const sourceAnswers = answersJson !== undefined ? answersJson : existing.answersJson;
    // Validation stricte : tous les champs required doivent être présents
    const validatedAnswers = validateFormAnswersAgainstSchema(template.schemaJson, sourceAnswers, true);

    const [updated] = await db
      .update(clinicalFormResponses)
      .set({
        answersJson: validatedAnswers,
        status: 'finalized',
        finalizedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(clinicalFormResponses.id, responseId),
          eq(clinicalFormResponses.organizationId, organizationId),
          eq(clinicalFormResponses.patientId, patientId),
          eq(clinicalFormResponses.practitionerId, practitionerId),
        ),
      )
      .returning();

    if (!updated) {
      throw new AppError('Échec de la finalisation du formulaire', 500);
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      templateId: updated.templateId,
      templateName: template.name,
      templateKind: template.kind,
      patientId: updated.patientId,
      practitionerId: updated.practitionerId,
      careEpisodeId: updated.careEpisodeId,
      encounterId: updated.encounterId,
      answersJson: updated.answersJson as ClinicalFormAnswers,
      status: updated.status as ClinicalFormResponseDTO['status'],
      finalizedAt: updated.finalizedAt ? new Date(updated.finalizedAt).toISOString() : null,
      createdAt: new Date(updated.createdAt).toISOString(),
      updatedAt: new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Récupère une réponse de formulaire individuelle.
   */
  async getFormResponse(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    responseId: string,
  ): Promise<ClinicalFormResponseDTO | null> {
    const [row] = await db
      .select({
        id: clinicalFormResponses.id,
        organizationId: clinicalFormResponses.organizationId,
        templateId: clinicalFormResponses.templateId,
        templateName: clinicalFormTemplates.name,
        templateKind: clinicalFormTemplates.kind,
        patientId: clinicalFormResponses.patientId,
        practitionerId: clinicalFormResponses.practitionerId,
        careEpisodeId: clinicalFormResponses.careEpisodeId,
        encounterId: clinicalFormResponses.encounterId,
        answersJson: clinicalFormResponses.answersJson,
        status: clinicalFormResponses.status,
        finalizedAt: clinicalFormResponses.finalizedAt,
        createdAt: clinicalFormResponses.createdAt,
        updatedAt: clinicalFormResponses.updatedAt,
      })
      .from(clinicalFormResponses)
      .innerJoin(
        clinicalFormTemplates,
        and(
          eq(clinicalFormResponses.templateId, clinicalFormTemplates.id),
          eq(clinicalFormResponses.organizationId, clinicalFormTemplates.organizationId),
          eq(clinicalFormResponses.practitionerId, clinicalFormTemplates.practitionerId),
        ),
      )
      .where(
        and(
          eq(clinicalFormResponses.id, responseId),
          eq(clinicalFormResponses.organizationId, organizationId),
          eq(clinicalFormResponses.patientId, patientId),
          eq(clinicalFormResponses.practitionerId, practitionerId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organizationId,
      templateId: row.templateId,
      templateName: row.templateName,
      templateKind: row.templateKind as ClinicalFormResponseDTO['templateKind'],
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      careEpisodeId: row.careEpisodeId,
      encounterId: row.encounterId,
      answersJson: row.answersJson as ClinicalFormAnswers,
      status: row.status as ClinicalFormResponseDTO['status'],
      finalizedAt: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /**
   * Liste les réponses de formulaire pour un patient.
   */
  async listFormResponses(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    options?: { careEpisodeId?: string; encounterId?: string },
  ): Promise<ClinicalFormResponseDTO[]> {
    await this.getPatientOrThrow(organizationId, patientId);

    const conditions = [
      eq(clinicalFormResponses.organizationId, organizationId),
      eq(clinicalFormResponses.patientId, patientId),
      eq(clinicalFormResponses.practitionerId, practitionerId),
    ];

    if (options?.careEpisodeId) {
      conditions.push(eq(clinicalFormResponses.careEpisodeId, options.careEpisodeId));
    }

    if (options?.encounterId) {
      conditions.push(eq(clinicalFormResponses.encounterId, options.encounterId));
    }

    const rows = await db
      .select({
        id: clinicalFormResponses.id,
        organizationId: clinicalFormResponses.organizationId,
        templateId: clinicalFormResponses.templateId,
        templateName: clinicalFormTemplates.name,
        templateKind: clinicalFormTemplates.kind,
        patientId: clinicalFormResponses.patientId,
        practitionerId: clinicalFormResponses.practitionerId,
        careEpisodeId: clinicalFormResponses.careEpisodeId,
        encounterId: clinicalFormResponses.encounterId,
        answersJson: clinicalFormResponses.answersJson,
        status: clinicalFormResponses.status,
        finalizedAt: clinicalFormResponses.finalizedAt,
        createdAt: clinicalFormResponses.createdAt,
        updatedAt: clinicalFormResponses.updatedAt,
      })
      .from(clinicalFormResponses)
      .innerJoin(
        clinicalFormTemplates,
        and(
          eq(clinicalFormResponses.templateId, clinicalFormTemplates.id),
          eq(clinicalFormResponses.organizationId, clinicalFormTemplates.organizationId),
          eq(clinicalFormResponses.practitionerId, clinicalFormTemplates.practitionerId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(clinicalFormResponses.createdAt), asc(clinicalFormResponses.id));

    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      templateId: row.templateId,
      templateName: row.templateName,
      templateKind: row.templateKind as ClinicalFormResponseDTO['templateKind'],
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      careEpisodeId: row.careEpisodeId,
      encounterId: row.encounterId,
      answersJson: row.answersJson as ClinicalFormAnswers,
      status: row.status as ClinicalFormResponseDTO['status'],
      finalizedAt: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  // ==========================================
  // SESSION 12 : CLINICAL MEASUREMENTS
  // ==========================================

  /**
   * Enregistre un relevé de mesure clinique (immuable).
   */
  async createMeasurement(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    input: CreateClinicalMeasurementInput,
  ): Promise<ClinicalMeasurementDTO> {
    await this.getPatientOrThrow(organizationId, patientId);

    const validated = validateMeasurementInput(input);

    await this.validateClinicalContextLinks(
      organizationId,
      patientId,
      practitionerId,
      validated.careEpisodeId,
      validated.encounterId,
    );

    const measurementId = randomUUID();

    const [created] = await db
      .insert(clinicalMeasurements)
      .values({
        id: measurementId,
        organizationId,
        patientId,
        practitionerId,
        careEpisodeId: validated.careEpisodeId,
        encounterId: validated.encounterId,
        code: validated.code,
        label: validated.label,
        valueNumeric: validated.valueNumeric !== null ? validated.valueNumeric.toString() : null,
        valueText: validated.valueText,
        unit: validated.unit,
        observedAt: new Date(validated.observedAt),
      })
      .returning();

    if (!created) {
      throw new AppError('Échec de création de la mesure', 500);
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      patientId: created.patientId,
      practitionerId: created.practitionerId,
      careEpisodeId: created.careEpisodeId,
      encounterId: created.encounterId,
      code: created.code,
      label: created.label,
      valueNumeric: created.valueNumeric !== null ? Number(created.valueNumeric) : null,
      valueText: created.valueText,
      unit: created.unit,
      observedAt: new Date(created.observedAt).toISOString(),
      createdAt: new Date(created.createdAt).toISOString(),
    };
  }

  /**
   * Liste les mesures cliniques d'un patient.
   */
  async listMeasurements(
    organizationId: string,
    patientId: string,
    practitionerId: string,
    options?: { code?: string; careEpisodeId?: string },
  ): Promise<ClinicalMeasurementDTO[]> {
    await this.getPatientOrThrow(organizationId, patientId);

    const conditions = [
      eq(clinicalMeasurements.organizationId, organizationId),
      eq(clinicalMeasurements.patientId, patientId),
      eq(clinicalMeasurements.practitionerId, practitionerId),
    ];

    if (options?.code) {
      conditions.push(eq(clinicalMeasurements.code, options.code));
    }

    if (options?.careEpisodeId) {
      conditions.push(eq(clinicalMeasurements.careEpisodeId, options.careEpisodeId));
    }

    const rows = await db
      .select()
      .from(clinicalMeasurements)
      .where(and(...conditions))
      .orderBy(desc(clinicalMeasurements.observedAt), asc(clinicalMeasurements.id));

    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      patientId: row.patientId,
      practitionerId: row.practitionerId,
      careEpisodeId: row.careEpisodeId,
      encounterId: row.encounterId,
      code: row.code,
      label: row.label,
      valueNumeric: row.valueNumeric !== null ? Number(row.valueNumeric) : null,
      valueText: row.valueText,
      unit: row.unit,
      observedAt: new Date(row.observedAt).toISOString(),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  // ==========================================
  // SESSION 12 : UNIFIED TIMELINE & OVERVIEW
  // ==========================================

  /**
   * Construit la timeline clinique chronologique unifiée pour un patient.
   */
  async getPatientClinicalTimeline(
    organizationId: string,
    patientId: string,
    practitionerId: string,
  ): Promise<ClinicalTimelineItem[]> {
    const episodes = await this.listCareEpisodes(organizationId, patientId, practitionerId);

    const encounterRows = await db
      .select({
        id: clinicalEncounters.id,
        organizationId: clinicalEncounters.organizationId,
        careEpisodeId: clinicalEncounters.careEpisodeId,
        patientId: clinicalEncounters.patientId,
        practitionerId: clinicalEncounters.practitionerId,
        appointmentId: clinicalEncounters.appointmentId,
        occurredAt: clinicalEncounters.occurredAt,
        createdAt: clinicalEncounters.createdAt,
        updatedAt: clinicalEncounters.updatedAt,
      })
      .from(clinicalEncounters)
      .where(
        and(
          eq(clinicalEncounters.organizationId, organizationId),
          eq(clinicalEncounters.patientId, patientId),
          eq(clinicalEncounters.practitionerId, practitionerId),
        ),
      )
      .orderBy(desc(clinicalEncounters.occurredAt), asc(clinicalEncounters.id));

    const encounters: ClinicalEncounterDTO[] = encounterRows.map((e) => ({
      id: e.id,
      organizationId: e.organizationId,
      careEpisodeId: e.careEpisodeId,
      patientId: e.patientId,
      practitionerId: e.practitionerId,
      appointmentId: e.appointmentId,
      occurredAt: new Date(e.occurredAt).toISOString(),
      createdAt: new Date(e.createdAt).toISOString(),
      updatedAt: new Date(e.updatedAt).toISOString(),
    }));

    const noteRows = await db
      .select()
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
        ),
      )
      .orderBy(desc(clinicalNotes.createdAt), asc(clinicalNotes.id));

    const notes: ClinicalNoteDTO[] = noteRows.map((n) => ({
      id: n.id,
      organizationId: n.organizationId,
      encounterId: n.encounterId,
      patientId: n.patientId,
      authorPractitionerId: n.authorPractitionerId,
      content: n.content,
      status: n.status as ClinicalNoteDTO['status'],
      finalizedAt: n.finalizedAt ? new Date(n.finalizedAt).toISOString() : null,
      createdAt: new Date(n.createdAt).toISOString(),
      updatedAt: new Date(n.updatedAt).toISOString(),
    }));

    const documents = await this.listClinicalDocuments(organizationId, patientId, practitionerId);
    const formResponses = await this.listFormResponses(organizationId, patientId, practitionerId);
    const measurements = await this.listMeasurements(organizationId, patientId, practitionerId);

    return buildClinicalTimeline({
      episodes,
      encounters,
      notes,
      documents,
      formResponses,
      measurements,
    });
  }

  /**
   * Calcule le résumé de la vue d'ensemble du dossier clinique.
   */
  async getPatientClinicalOverview(
    organizationId: string,
    patientId: string,
    practitionerId: string,
  ) {
    const episodes = await this.listCareEpisodes(organizationId, patientId, practitionerId);
    const activeEpisodes = episodes.filter((e) => e.status === 'active');

    const documents = await this.listClinicalDocuments(organizationId, patientId, practitionerId, {
      isArchived: false,
    });
    const formResponses = await this.listFormResponses(organizationId, patientId, practitionerId);
    const draftResponses = formResponses.filter((r) => r.status === 'draft');
    const measurements = await this.listMeasurements(organizationId, patientId, practitionerId);

    // Dernière séance
    const [lastEncounterRow] = await db
      .select({
        id: clinicalEncounters.id,
        occurredAt: clinicalEncounters.occurredAt,
        careEpisodeId: clinicalEncounters.careEpisodeId,
      })
      .from(clinicalEncounters)
      .where(
        and(
          eq(clinicalEncounters.organizationId, organizationId),
          eq(clinicalEncounters.patientId, patientId),
          eq(clinicalEncounters.practitionerId, practitionerId),
        ),
      )
      .orderBy(desc(clinicalEncounters.occurredAt))
      .limit(1);

    // Dernière note finalisée
    const [lastNoteRow] = await db
      .select({
        id: clinicalNotes.id,
        content: clinicalNotes.content,
        finalizedAt: clinicalNotes.finalizedAt,
      })
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.organizationId, organizationId),
          eq(clinicalNotes.patientId, patientId),
          eq(clinicalNotes.authorPractitionerId, practitionerId),
          eq(clinicalNotes.status, 'finalized'),
        ),
      )
      .orderBy(desc(clinicalNotes.finalizedAt))
      .limit(1);

    return {
      activeEpisodesCount: activeEpisodes.length,
      totalEpisodesCount: episodes.length,
      lastEncounter: lastEncounterRow
        ? {
            id: lastEncounterRow.id,
            occurredAt: new Date(lastEncounterRow.occurredAt).toISOString(),
            careEpisodeId: lastEncounterRow.careEpisodeId,
          }
        : null,
      lastFinalizedNote: lastNoteRow
        ? {
            id: lastNoteRow.id,
            contentSnippet: lastNoteRow.content.length > 120 ? `${lastNoteRow.content.slice(0, 117)}...` : lastNoteRow.content,
            finalizedAt: lastNoteRow.finalizedAt ? new Date(lastNoteRow.finalizedAt).toISOString() : null,
          }
        : null,
      recentDocuments: documents.slice(0, 5),
      recentMeasurements: measurements.slice(0, 5),
      draftFormResponsesCount: draftResponses.length,
      totalDocumentsCount: documents.length,
    };
  }
}

export const clinicalRecordService = new ClinicalRecordService();

