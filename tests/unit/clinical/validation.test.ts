import { describe, it, expect } from 'vitest';
import {
  createCareEpisodeSchema,
  createClinicalEncounterSchema,
  createClinicalNoteSchema,
  updateDraftClinicalNoteSchema,
  closeCareEpisodeSchema,
  finalizeClinicalNoteSchema,
} from '@/lib/clinical/validation';

describe('Clinical Validation Schemas', () => {
  describe('createCareEpisodeSchema', () => {
    it('accepts valid title and trims whitespace', () => {
      const result = createCareEpisodeSchema.parse({
        title: '  Épisode rééducation épaule  ',
      });
      expect(result.title).toBe('Épisode rééducation épaule');
    });

    it('transforms empty or blank title to null', () => {
      expect(createCareEpisodeSchema.parse({ title: '' }).title).toBeNull();
      expect(createCareEpisodeSchema.parse({ title: '   ' }).title).toBeNull();
      expect(createCareEpisodeSchema.parse({}).title).toBeNull();
      expect(createCareEpisodeSchema.parse({ title: null }).title).toBeNull();
    });

    it('rejects title longer than 160 characters', () => {
      const longTitle = 'a'.repeat(161);
      expect(() => createCareEpisodeSchema.parse({ title: longTitle })).toThrow();
    });
  });

  describe('createClinicalEncounterSchema', () => {
    it('accepts valid encounter payload without appointmentId', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const result = createClinicalEncounterSchema.parse({
        careEpisodeId: 'episode-123',
        occurredAt: pastDate,
      });
      expect(result.careEpisodeId).toBe('episode-123');
      expect(result.occurredAt).toBe(pastDate);
      expect(result.appointmentId).toBeNull();
    });

    it('accepts valid encounter with appointmentId and normalizes blank to null', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const result1 = createClinicalEncounterSchema.parse({
        careEpisodeId: 'episode-123',
        occurredAt: pastDate,
        appointmentId: 'appt-456',
      });
      expect(result1.appointmentId).toBe('appt-456');

      const result2 = createClinicalEncounterSchema.parse({
        careEpisodeId: 'episode-123',
        occurredAt: pastDate,
        appointmentId: '   ',
      });
      expect(result2.appointmentId).toBeNull();
    });

    it('rejects missing careEpisodeId', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      expect(() =>
        createClinicalEncounterSchema.parse({
          careEpisodeId: '',
          occurredAt: pastDate,
        }),
      ).toThrow();
    });

    it('rejects invalid date format', () => {
      expect(() =>
        createClinicalEncounterSchema.parse({
          careEpisodeId: 'episode-123',
          occurredAt: 'not-a-date',
        }),
      ).toThrow();
    });

    it('rejects future occurredAt date', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(() =>
        createClinicalEncounterSchema.parse({
          careEpisodeId: 'episode-123',
          occurredAt: futureDate,
        }),
      ).toThrow();
    });
  });

  describe('createClinicalNoteSchema', () => {
    it('accepts valid note content and trims whitespace', () => {
      const result = createClinicalNoteSchema.parse({
        encounterId: 'encounter-123',
        content: '  Observations cliniques de début de rééducation.  ',
      });
      expect(result.encounterId).toBe('encounter-123');
      expect(result.content).toBe('Observations cliniques de début de rééducation.');
    });

    it('rejects empty or blank content', () => {
      expect(() =>
        createClinicalNoteSchema.parse({
          encounterId: 'encounter-123',
          content: '',
        }),
      ).toThrow();

      expect(() =>
        createClinicalNoteSchema.parse({
          encounterId: 'encounter-123',
          content: '    ',
        }),
      ).toThrow();
    });

    it('rejects content longer than 50000 characters', () => {
      const hugeContent = 'x'.repeat(50001);
      expect(() =>
        createClinicalNoteSchema.parse({
          encounterId: 'encounter-123',
          content: hugeContent,
        }),
      ).toThrow();
    });

    it('rejects missing encounterId', () => {
      expect(() =>
        createClinicalNoteSchema.parse({
          encounterId: '',
          content: 'Note valide',
        }),
      ).toThrow();
    });
  });

  describe('updateDraftClinicalNoteSchema', () => {
    it('accepts valid update content', () => {
      const result = updateDraftClinicalNoteSchema.parse({
        content: 'Mise à jour du brouillon.',
      });
      expect(result.content).toBe('Mise à jour du brouillon.');
    });

    it('rejects empty content', () => {
      expect(() => updateDraftClinicalNoteSchema.parse({ content: '   ' })).toThrow();
    });
  });

  describe('closeCareEpisodeSchema & finalizeClinicalNoteSchema', () => {
    it('accepts valid episodeId', () => {
      const result = closeCareEpisodeSchema.parse({ episodeId: 'ep-123' });
      expect(result.episodeId).toBe('ep-123');
    });

    it('rejects empty episodeId', () => {
      expect(() => closeCareEpisodeSchema.parse({ episodeId: '' })).toThrow();
    });

    it('accepts valid noteId', () => {
      const result = finalizeClinicalNoteSchema.parse({ noteId: 'note-123' });
      expect(result.noteId).toBe('note-123');
    });

    it('rejects empty noteId', () => {
      expect(() => finalizeClinicalNoteSchema.parse({ noteId: '' })).toThrow();
    });
  });
});
