'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as invoiceActions from '@/app/actions/invoice.actions';
import * as clientActions from '@/app/actions/client.actions';
import * as productActions from '@/app/actions/product.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Client, Product, Invoice } from '@/lib/data/interfaces';
import InvoiceForm, { InvoiceFormData } from '@/components/crm/InvoiceForm';
import { handleError } from '@/lib/utils/error-handler';

export default function NewInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: InvoiceFormData & { totalHT: number; taxAmount: number; totalTTC: number }) => {
    if (!user?.organizationId) return;
    
    setIsSubmitting(true);
    try {
      const type = data.type || 'invoice';
      const number = await invoiceActions.getNextInvoiceNumberAction(user.organizationId, type);
      
      const { lines, ...rest } = data;

      const newInvoice = await invoiceActions.createAction({
        type: type as any,
        number,
        date: data.date || new Date().toISOString(),
        dueDate: data.dueDate,
        status: 'draft',
        clientId: data.clientId || '',
        organizationId: user.organizationId,
        totalHT: data.totalHT || 0,
        taxAmount: data.taxAmount || 0,
        totalTTC: data.totalTTC || 0,
        message: data.message, // Notes from form mapping to message
      }, (lines || []) as any, user.id);

      // activityLog disabled
      
      alert(data.type === 'invoice' ? 'Facture créée avec succès !' : 'Devis créé avec succès !');
      if (data.type === 'invoice') {
        router.push(`/facturation/factures/${newInvoice.id}`);
      } else {
        router.push(`/facturation/devis/${newInvoice.id}`);
      }
      router.refresh();
    } catch (error) {
      handleError(error, "Erreur lors de la création du document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Document</h1>
        <p className="mt-1 text-sm text-gray-500">
          Créer un devis ou une facture.
        </p>
      </div>

      <InvoiceForm 
        organizationId={user?.organizationId || ''}
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
}
