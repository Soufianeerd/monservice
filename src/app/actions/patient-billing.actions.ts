'use server';

import { revalidatePath } from 'next/cache';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientBillingService } from '@/lib/services/patient-billing.service';
import { createPatientInvoiceSchema } from '@/lib/patient-billing/validation';
import type { PatientInvoiceDTO } from '@/lib/patient-billing/types';

export async function createPatientInvoiceAction(
  patientId: string,
  rawInput: unknown,
): Promise<PatientInvoiceDTO> {
  const { organizationId, practitionerId, userId } = await requireClinicalPractitionerContext();
  const input = createPatientInvoiceSchema.parse({
    ...(typeof rawInput === 'object' && rawInput !== null ? rawInput : {}),
    patientId,
  });

  const invoice = await patientBillingService.createPatientInvoice(
    organizationId,
    practitionerId,
    userId,
    input,
  );

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/factures`);
  revalidatePath('/invoices');
  return invoice;
}

export async function listPatientInvoicesAction(
  patientId: string,
): Promise<PatientInvoiceDTO[]> {
  const { organizationId } = await requireClinicalPractitionerContext();
  return patientBillingService.listPatientInvoices(organizationId, patientId);
}

export async function getMyPatientInvoicesAction(
  patientId?: string,
): Promise<PatientInvoiceDTO[]> {
  const portalCtx = await requirePatientPortalAccess(patientId);
  return patientBillingService.getMyPatientInvoices(
    portalCtx.userId,
    portalCtx.patientId,
  );
}
