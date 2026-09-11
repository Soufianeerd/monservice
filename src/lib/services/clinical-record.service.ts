import { db } from '@/lib/db/server';
import {
  careEpisodes,
  clinicalEncounters,
  clinicalNotes,
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
  ClinicalEncounterWithNotesDTO,
  CareEpisodeDetailDTO,
  EligibleAppointmentDTO,
  CreateCareEpisodeInput,
  CreateClinicalEncounterInput,
  CreateClinicalNoteInput,
} from '@/lib/clinical/types';

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
}

export const clinicalRecordService = new ClinicalRecordService();
