'use server';

import { invoiceService } from '@/lib/services/invoice.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId?: any) {
  return await invoiceService.findAll(organizationId);
}

export async function findByClientAction(clientId?: any) {
  return await invoiceService.findByClient(clientId);
}

export async function findByProfessionalAction(professionalId?: any) {
  return await invoiceService.findByProfessional(professionalId);
}

export async function findByIdAction(id?: any, organizationId?: any) {
  return await invoiceService.findById(id, organizationId);
}

export async function getByIdAction(id?: any) {
  return await invoiceService.getById(id);
}

export async function updateSignatureAction(id?: any, signatureData?: any) {
  return await invoiceService.updateSignature(id, signatureData);
}

export async function markAsPaidAction(id?: any, paymentIntentId?: any) {
  return await invoiceService.markAsPaid(id, paymentIntentId);
}

export async function generateNumberAction(type?: any, organizationId?: any) {
  return await invoiceService.generateNumber(type, organizationId);
}

export async function calculateTotalsAction(invoiceId?: any, organizationId?: any) {
  return await invoiceService.calculateTotals(invoiceId, organizationId);
}

export async function createAction(data?: any, lines?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await invoiceService.create(data, lines, userId);
}

export async function updateAction(id?: any, organizationId?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await invoiceService.update(id, organizationId, data, userId);
}

export async function deleteAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await invoiceService.delete(id, organizationId, userId);
}

export async function getNextInvoiceNumberAction(organizationId?: any, type?: any) {
  return await invoiceService.getNextInvoiceNumber(organizationId, type);
}

