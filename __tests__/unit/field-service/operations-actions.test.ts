import { describe, it, expect } from 'vitest';
import {
  createFieldServiceSiteSchema,
  updateFieldServiceSiteSchema,
  createFieldServiceWorkOrderSchema,
  updateFieldServiceWorkOrderSchema,
  scheduleFieldServiceWorkOrderSchema,
  transitionFieldServiceWorkOrderSchema,
  assignFieldServiceWorkerSchema,
  unassignFieldServiceWorkerSchema,
  createFieldServiceWorkReportSchema,
  updateFieldServiceWorkReportSchema,
  finalizeFieldServiceWorkReportSchema,
} from '../../../src/lib/validation/field-service-operations.schemas';

describe('Field Service Operations Zod Validation Schemas (Session 17)', () => {
  // ==========================================================================
  // 1. Site Schemas
  // ==========================================================================
  describe('Site Schemas', () => {
    it('validates a valid create site input', () => {
      const input = {
        clientId: 'cli-123',
        label: 'Chantier Villa Belle-Vue',
        addressLine1: '12 Impasse des Pins',
        addressLine2: 'Bâtiment B',
        postalCode: '13008',
        city: 'Marseille',
        country: 'FR',
        latitude: 43.2965,
        longitude: 5.3698,
        accessInstructions: 'Digicode 4589, sonner à l’interphone',
      };
      const parsed = createFieldServiceSiteSchema.parse(input);
      expect(parsed.label).toBe('Chantier Villa Belle-Vue');
      expect(parsed.latitude).toBe(43.2965);
    });

    it('rejects create site with empty label or address', () => {
      expect(() =>
        createFieldServiceSiteSchema.parse({
          clientId: 'cli-123',
          label: '',
          addressLine1: '10 Rue de Paris',
          postalCode: '75001',
          city: 'Paris',
        })
      ).toThrow();

      expect(() =>
        createFieldServiceSiteSchema.parse({
          clientId: 'cli-123',
          label: 'Site A',
          addressLine1: '',
          postalCode: '75001',
          city: 'Paris',
        })
      ).toThrow();
    });

    it('rejects latitude and longitude out of geographic bounds', () => {
      expect(() =>
        createFieldServiceSiteSchema.parse({
          clientId: 'cli-123',
          label: 'Out of bounds Lat',
          addressLine1: '10 Rue de Paris',
          postalCode: '75001',
          city: 'Paris',
          latitude: 95.0,
        })
      ).toThrow();

      expect(() =>
        createFieldServiceSiteSchema.parse({
          clientId: 'cli-123',
          label: 'Out of bounds Lng',
          addressLine1: '10 Rue de Paris',
          postalCode: '75001',
          city: 'Paris',
          longitude: -185.0,
        })
      ).toThrow();
    });

    it('validates update site schema', () => {
      const validUpdate = updateFieldServiceSiteSchema.parse({
        id: 'site-123',
        label: 'Updated Site Name',
        isActive: false,
      });
      expect(validUpdate.id).toBe('site-123');
      expect(validUpdate.label).toBe('Updated Site Name');
      expect(validUpdate.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Work Order Schemas
  // ==========================================================================
  describe('Work Order Schemas', () => {
    it('validates a complete create work order payload', () => {
      const valid = createFieldServiceWorkOrderSchema.parse({
        clientId: 'cli-123',
        siteId: 'site-456',
        title: 'Rénovation tableau électrique',
        description: 'Mise en conformité NFC 15-100',
        workType: 'installation',
        priority: 'high',
        scheduledStart: '2026-10-15T08:00:00.000Z',
        scheduledEnd: '2026-10-15T17:00:00.000Z',
      });
      expect(valid.title).toBe('Rénovation tableau électrique');
      expect(valid.workType).toBe('installation');
      expect(valid.priority).toBe('high');
    });

    it('rejects invalid workType and priority enums', () => {
      expect(() =>
        createFieldServiceWorkOrderSchema.parse({
          clientId: 'cli-123',
          title: 'Test',
          workType: 'invalid_type',
        })
      ).toThrow();

      expect(() =>
        createFieldServiceWorkOrderSchema.parse({
          clientId: 'cli-123',
          title: 'Test',
          priority: 'critical_emergency',
        })
      ).toThrow();
    });

    it('validates schedule work order payload', () => {
      const valid = scheduleFieldServiceWorkOrderSchema.parse({
        id: 'wo-123',
        scheduledStart: '2026-10-15T08:00:00.000Z',
        scheduledEnd: '2026-10-15T12:00:00.000Z',
      });
      expect(valid.id).toBe('wo-123');
    });

    it('validates transition work order with cancellation reason when cancelled', () => {
      const validCancel = transitionFieldServiceWorkOrderSchema.parse({
        id: 'wo-123',
        toStatus: 'cancelled',
        cancellationReasonCode: 'customer_request',
        cancellationNotes: 'Client a annulé la demande par téléphone',
      });
      expect(validCancel.toStatus).toBe('cancelled');
      expect(validCancel.cancellationReasonCode).toBe('customer_request');

      const validStart = transitionFieldServiceWorkOrderSchema.parse({
        id: 'wo-123',
        toStatus: 'in_progress',
      });
      expect(validStart.toStatus).toBe('in_progress');
    });
  });

  // ==========================================================================
  // 3. Assignment Schemas
  // ==========================================================================
  describe('Assignment Schemas', () => {
    it('validates assign worker with role enum', () => {
      const valid = assignFieldServiceWorkerSchema.parse({
        workOrderId: 'wo-123',
        userId: 'user-tech-1',
        role: 'technician',
      });
      expect(valid.role).toBe('technician');

      const lead = assignFieldServiceWorkerSchema.parse({
        workOrderId: 'wo-123',
        userId: 'user-lead-1',
        role: 'lead',
      });
      expect(lead.role).toBe('lead');
    });

    it('rejects invalid assignment role', () => {
      expect(() =>
        assignFieldServiceWorkerSchema.parse({
          workOrderId: 'wo-123',
          userId: 'user-1',
          role: 'boss',
        })
      ).toThrow();
    });

    it('validates unassign worker payload', () => {
      const valid = unassignFieldServiceWorkerSchema.parse({
        assignmentId: 'assign-123',
      });
      expect(valid.assignmentId).toBe('assign-123');
    });
  });

  // ==========================================================================
  // 4. Work Report Schemas
  // ==========================================================================
  describe('Work Report Schemas', () => {
    it('validates report creation with structured notes', () => {
      const report = createFieldServiceWorkReportSchema.parse({
        workOrderId: 'wo-123',
        summary: 'Intervention plomberie terminée avec succès',
        workPerformed: 'Remplacement du groupe de sécurité et détartrage du chauffe-eau.',
        issuesFound: 'Présence d’un fort taux de calcaire sur l’arrivée d’eau froide.',
        recommendations: 'Prévoir la pose d’un adoucisseur d’eau au prochain entretien.',
        customerNotes: 'Le client a validé les travaux et signé le bon sur place.',
      });
      expect(report.summary).toBe('Intervention plomberie terminée avec succès');
      expect(report.recommendations).toContain('adoucisseur');
    });

    it('rejects report creation without summary', () => {
      expect(() =>
        createFieldServiceWorkReportSchema.parse({
          workOrderId: 'wo-123',
          summary: '',
        })
      ).toThrow();
    });

    it('validates update and finalize report schemas', () => {
      const update = updateFieldServiceWorkReportSchema.parse({
        id: 'rep-123',
        summary: 'Updated summary',
      });
      expect(update.id).toBe('rep-123');

      const finalize = finalizeFieldServiceWorkReportSchema.parse({
        id: 'rep-123',
      });
      expect(finalize.id).toBe('rep-123');
    });
  });
});
