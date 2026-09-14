import { describe, it, expect } from 'vitest';
import { buildClinicalTimeline } from '@/lib/clinical/timeline';
import type {
  CareEpisodeDTO,
  ClinicalEncounterDTO,
  ClinicalNoteDTO,
  ClinicalDocumentDTO,
  ClinicalFormResponseDTO,
  ClinicalMeasurementDTO,
} from '@/lib/clinical/types';

describe('Unified Clinical Timeline Domain Builder', () => {
  const mockEpisodes: CareEpisodeDTO[] = [
    {
      id: 'ep-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      title: 'Rééducation rachis',
      status: 'closed',
      startedAt: '2026-08-01T08:00:00.000Z',
      closedAt: '2026-08-30T18:00:00.000Z',
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-30T18:00:00.000Z',
    },
  ];

  const mockEncounters: ClinicalEncounterDTO[] = [
    {
      id: 'enc-1',
      organizationId: 'org-1',
      careEpisodeId: 'ep-1',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      appointmentId: 'appt-1',
      occurredAt: '2026-08-10T14:00:00.000Z',
      createdAt: '2026-08-10T14:00:00.000Z',
      updatedAt: '2026-08-10T14:00:00.000Z',
    },
  ];

  const mockNotes: ClinicalNoteDTO[] = [
    {
      id: 'note-1',
      organizationId: 'org-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      authorPractitionerId: 'prac-1',
      content: 'Amélioration notable des amplitudes articulaires.',
      status: 'finalized',
      finalizedAt: '2026-08-10T14:30:00.000Z',
      createdAt: '2026-08-10T14:15:00.000Z',
      updatedAt: '2026-08-10T14:30:00.000Z',
    },
  ];

  const mockDocuments: ClinicalDocumentDTO[] = [
    {
      id: 'doc-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      careEpisodeId: 'ep-1',
      encounterId: 'enc-1',
      title: 'Ordonnance kiné',
      category: 'prescription',
      fileName: 'ordo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 102400,
      storagePath: 'org-1/prac-1/pat-1/doc-1/ordo.pdf',
      patientVisible: false,
      isArchived: false,
      createdAt: '2026-08-05T09:00:00.000Z',
      updatedAt: '2026-08-05T09:00:00.000Z',
    },
  ];

  const mockFormResponses: ClinicalFormResponseDTO[] = [
    {
      id: 'form-1',
      organizationId: 'org-1',
      templateId: 'tpl-1',
      templateName: 'Bilan initial',
      templateKind: 'assessment',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      careEpisodeId: 'ep-1',
      encounterId: null,
      answersJson: { score: 8, commentaire: 'Bien' },
      status: 'finalized',
      finalizedAt: '2026-08-02T10:00:00.000Z',
      createdAt: '2026-08-02T09:00:00.000Z',
      updatedAt: '2026-08-02T10:00:00.000Z',
    },
  ];

  const mockMeasurements: ClinicalMeasurementDTO[] = [
    {
      id: 'm-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      careEpisodeId: 'ep-1',
      encounterId: 'enc-1',
      code: 'pain_score',
      label: 'Échelle de douleur EVA',
      valueNumeric: 4,
      valueText: null,
      unit: '/10',
      observedAt: '2026-08-10T14:05:00.000Z',
      createdAt: '2026-08-10T14:05:00.000Z',
    },
  ];

  it('aggregates all 7 types of events into a unified chronological timeline (descending)', () => {
    const timeline = buildClinicalTimeline({
      episodes: mockEpisodes,
      encounters: mockEncounters,
      notes: mockNotes,
      documents: mockDocuments,
      formResponses: mockFormResponses,
      measurements: mockMeasurements,
    });

    expect(timeline.length).toBe(7); // 1 opened, 1 closed, 1 enc, 1 note, 1 doc, 1 form, 1 measurement

    // Verify chronological order (latest timestamp first)
    for (let i = 0; i < timeline.length - 1; i++) {
      const current = new Date(timeline[i].timestamp).getTime();
      const next = new Date(timeline[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }

    // Latest event should be episode closed on 2026-08-30
    expect(timeline[0].type).toBe('episode_closed');
    expect(timeline[0].title).toContain('Clôture');

    // Earliest event should be episode opened on 2026-08-01
    expect(timeline[timeline.length - 1].type).toBe('episode_opened');
    expect(timeline[timeline.length - 1].title).toContain('Ouverture');
  });

  it('correctly maps metadata, categories, snippets, and document sizes', () => {
    const timeline = buildClinicalTimeline({
      episodes: [],
      encounters: [],
      notes: mockNotes,
      documents: mockDocuments,
      formResponses: mockFormResponses,
      measurements: mockMeasurements,
    });

    const docItem = timeline.find((t) => t.type === 'document');
    expect(docItem).toBeDefined();
    expect(docItem?.title).toBe('Ordonnance kiné');
    expect(docItem?.category).toBe('prescription');
    expect(docItem?.sizeBytes).toBe(102400);

    const formItem = timeline.find((t) => t.type === 'form_response');
    expect(formItem).toBeDefined();
    expect(formItem?.title).toBe('Bilan initial');
    expect(formItem?.status).toBe('finalized');

    const measurementItem = timeline.find((t) => t.type === 'measurement');
    expect(measurementItem).toBeDefined();
    expect(measurementItem?.snippet).toContain('4 /10');
  });
});
