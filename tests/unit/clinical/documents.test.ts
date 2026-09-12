import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  buildClinicalDocumentStoragePath,
  validateDocumentFile,
} from '@/lib/clinical/documents';
import { AppError } from '@/lib/errors';

describe('Clinical Documents Domain Functions', () => {
  describe('sanitizeFileName', () => {
    it('sanitizes special characters, accents and spaces', () => {
      const raw = 'Ordonnance Dr Martin éàù & test (1).pdf';
      const sanitized = sanitizeFileName(raw);
      expect(sanitized).toBe('ordonnance_dr_martin_eau_and_test_1.pdf');
    });

    it('prevents directory traversal attempts', () => {
      const traversal = '../../etc/passwd';
      const sanitized = sanitizeFileName(traversal);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('provides fallback when all characters are stripped', () => {
      const raw = '???!!!###';
      const sanitized = sanitizeFileName(raw);
      expect(sanitized).toBe('document.bin');
    });

    it('truncates excessively long file names while preserving extension', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(200);
      expect(sanitized.endsWith('.pdf')).toBe(true);
    });
  });

  describe('buildClinicalDocumentStoragePath', () => {
    it('constructs strict canonical storage path', () => {
      const path = buildClinicalDocumentStoragePath(
        'org-123',
        'prac-456',
        'pat-789',
        'doc-abc',
        'My Scan File.pdf',
      );
      expect(path).toBe('org-123/prac-456/pat-789/doc-abc/my_scan_file.pdf');
    });
  });

  describe('validateDocumentFile', () => {
    it('accepts valid PDF document within 10 MiB limit', () => {
      const validated = validateDocumentFile(
        'application/pdf',
        5 * 1024 * 1024,
        'Compte rendu de consultation',
        'correspondence',
      );
      expect(validated.mimeType).toBe('application/pdf');
      expect(validated.sizeBytes).toBe(5242880);
      expect(validated.title).toBe('Compte rendu de consultation');
    });

    it('accepts image formats (JPEG, PNG, WEBP)', () => {
      expect(validateDocumentFile('image/jpeg', 1024, 'Radio', 'report').mimeType).toBe('image/jpeg');
      expect(validateDocumentFile('image/png', 2048, 'Bilan', 'result').mimeType).toBe('image/png');
      expect(validateDocumentFile('image/webp', 4096, 'Ordonnance', 'prescription').mimeType).toBe('image/webp');
    });

    it('rejects unsupported mime types', () => {
      expect(() =>
        validateDocumentFile('application/zip', 1024, 'Archive', 'other'),
      ).toThrow(AppError);

      expect(() =>
        validateDocumentFile('text/html', 1024, 'Page', 'other'),
      ).toThrow(AppError);
    });

    it('rejects files exceeding 10 MiB limit', () => {
      expect(() =>
        validateDocumentFile('application/pdf', 10 * 1024 * 1024 + 1, 'Gros PDF', 'other'),
      ).toThrow(AppError);
    });

    it('rejects empty or invalid title', () => {
      expect(() =>
        validateDocumentFile('application/pdf', 1024, '', 'other'),
      ).toThrow(AppError);

      expect(() =>
        validateDocumentFile('application/pdf', 1024, 'a'.repeat(201), 'other'),
      ).toThrow(AppError);
    });
  });
});
