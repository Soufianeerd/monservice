import {
  CareEpisodeDTO,
  ClinicalEncounterDTO,
  ClinicalNoteDTO,
  ClinicalDocumentDTO,
  ClinicalFormResponseDTO,
  ClinicalMeasurementDTO,
  ClinicalTimelineItem,
} from './types';

export interface BuildTimelineOptions {
  episodes: CareEpisodeDTO[];
  encounters: ClinicalEncounterDTO[];
  notes: ClinicalNoteDTO[];
  documents: ClinicalDocumentDTO[];
  formResponses: ClinicalFormResponseDTO[];
  measurements: ClinicalMeasurementDTO[];
}

/**
 * Agrège les événements cliniques hétérogènes d'un patient pour le praticien connecté
 * en une timeline chronologique unifiée, triée de manière déterministe (timestamp DESC, puis id ASC).
 */
export function buildClinicalTimeline(options: BuildTimelineOptions): ClinicalTimelineItem[] {
  const items: ClinicalTimelineItem[] = [];

  // 1. Épisodes (ouverture et clôture)
  for (const ep of options.episodes) {
    items.push({
      type: 'episode_opened',
      id: `ep-open-${ep.id}`,
      timestamp: ep.startedAt,
      title: `Ouverture de prise en charge : ${ep.title || 'Épisode sans titre'}`,
      subtitle: ep.title || undefined,
      practitionerId: ep.practitionerId,
    });

    if (ep.status === 'closed' && ep.closedAt) {
      items.push({
        type: 'episode_closed',
        id: `ep-close-${ep.id}`,
        timestamp: ep.closedAt,
        title: `Clôture de prise en charge : ${ep.title || 'Épisode sans titre'}`,
        subtitle: ep.title || undefined,
        practitionerId: ep.practitionerId,
      });
    }
  }

  // 2. Séances cliniques
  for (const enc of options.encounters) {
    items.push({
      type: 'encounter',
      id: `enc-${enc.id}`,
      timestamp: enc.occurredAt,
      title: 'Séance clinique',
      subtitle: `Séance réalisée le ${new Date(enc.occurredAt).toLocaleString('fr-FR')}`,
      practitionerId: enc.practitionerId,
    });
  }

  // Map encounter -> careEpisodeId for notes
  const encounterEpisodeMap = new Map<string, string>();
  for (const enc of options.encounters) {
    encounterEpisodeMap.set(enc.id, enc.careEpisodeId);
  }

  // 3. Notes cliniques
  for (const note of options.notes) {
    const snippet = note.content.length > 140 ? `${note.content.slice(0, 137)}...` : note.content;
    items.push({
      type: 'note',
      id: `note-${note.id}`,
      timestamp: note.createdAt,
      title: note.status === 'finalized' ? 'Note clinique validée' : 'Note clinique (brouillon)',
      snippet,
      contentSnippet: snippet,
      status: note.status,
      finalizedAt: note.finalizedAt,
      encounterId: note.encounterId,
      episodeId: encounterEpisodeMap.get(note.encounterId) || null,
      practitionerId: note.authorPractitionerId,
    });
  }

  // 4. Documents cliniques
  for (const doc of options.documents) {
    items.push({
      type: 'document',
      id: `doc-${doc.id}`,
      timestamp: doc.createdAt,
      title: doc.title,
      subtitle: doc.fileName,
      category: doc.category,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      isArchived: doc.isArchived,
      episodeId: doc.careEpisodeId,
      encounterId: doc.encounterId,
      practitionerId: doc.practitionerId,
    });
  }

  // 5. Réponses aux formulaires
  for (const resp of options.formResponses) {
    items.push({
      type: 'form_response',
      id: `form-resp-${resp.id}`,
      timestamp: resp.createdAt,
      title: resp.templateName || 'Bilan clinique',
      templateId: resp.templateId,
      templateName: resp.templateName,
      templateKind: resp.templateKind,
      status: resp.status,
      finalizedAt: resp.finalizedAt,
      episodeId: resp.careEpisodeId,
      encounterId: resp.encounterId,
      snippet: Object.entries(resp.answersJson || {})
        .map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : String(v)}`)
        .join(' · '),
      practitionerId: resp.practitionerId,
    });
  }

  // 6. Mesures cliniques
  for (const m of options.measurements) {
    items.push({
      type: 'measurement',
      id: `meas-${m.id}`,
      timestamp: m.observedAt,
      title: m.label,
      subtitle: `Code : ${m.code}`,
      snippet: `${m.valueNumeric !== null ? m.valueNumeric : m.valueText}${m.unit ? ' ' + m.unit : ''}`,
      code: m.code,
      label: m.label,
      valueNumeric: m.valueNumeric,
      valueText: m.valueText,
      unit: m.unit,
      episodeId: m.careEpisodeId,
      encounterId: m.encounterId,
      practitionerId: m.practitionerId,
    });
  }

  // Tri déterministe DESC
  items.sort((a, b) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.id.localeCompare(b.id);
  });

  return items;
}
