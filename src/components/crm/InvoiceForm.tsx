'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Invoice, Client, Product, InvoiceLine } from '@/lib/data/interfaces';
import { generateId } from '@/lib/utils/id-generator';

import { invoiceSchema, invoiceLineSchema } from '@/lib/validation/schemas';

const invoiceFormSchema = invoiceSchema.extend({
  lines: z.array(invoiceLineSchema).min(1, "Au moins une ligne est requise")
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  initialData?: Invoice;
  clients: Client[];
  products: Product[];
  onSubmit: (data: InvoiceFormData & { totalHT: number; taxAmount: number; totalTTC: number }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function InvoiceForm({ initialData, clients, products, onSubmit, isSubmitting }: InvoiceFormProps) {
  const router = useRouter();
  
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      type: initialData?.type || 'invoice',
      status: initialData?.status || 'draft',
      clientId: initialData?.clientId || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
      lines: initialData?.lines.length ? initialData.lines.map(line => ({
        ...line,
        productId: line.productId || undefined,
        discount: line.discount || 0
      })) : [{
        productId: undefined, description: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0
      }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines"
  });

  const watchLines = watch('lines');
  const watchType = watch('type');
  
  const [totals, setTotals] = useState({ totalHT: 0, taxAmount: 0, totalTTC: 0 });

  // Calcul des totaux dynamique
  useEffect(() => {
    let ht = 0;
    let tax = 0;

    watchLines.forEach((line) => {
      const q = Number(line.quantity) || 0;
      const up = Number(line.unitPrice) || 0;
      const d = Number(line.discount) || 0;
      const t = Number(line.taxRate) || 0;

      const lineHT = q * up * (1 - d / 100);
      const lineTax = lineHT * (t / 100);

      ht += lineHT;
      tax += lineTax;
    });

    setTotals({
      totalHT: ht,
      taxAmount: tax,
      totalTTC: ht + tax
    });
  }, [watchLines]);

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`lines.${index}.description`, product.name);
      setValue(`lines.${index}.unitPrice`, product.unitPrice);
      setValue(`lines.${index}.taxRate`, product.taxRate || 0);
    }
  };

  const submitForm = async (data: InvoiceFormData) => {
    await onSubmit({
      ...data,
      totalHT: totals.totalHT,
      taxAmount: totals.taxAmount,
      totalTTC: totals.totalTTC,
    });
  };

  return (
    <form onSubmit={handleSubmit(data => onSubmit({ ...data, ...totals } as any))} className="space-y-8 max-w-4xl bg-white p-6 rounded-lg shadow border border-gray-200">
      
      {/* Informations Générales */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type de document</label>
          <select
            {...register('type')}
            className="text-gray-900 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="invoice">Facture</option>
            <option value="quote">Devis</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Client *</label>
          <select
            {...register('clientId')}
            className="text-gray-900 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Sélectionnez un client...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date d'émission *</label>
          <input
            type="date"
            {...register('date')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>

        {watchType === 'invoice' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Date d'échéance</label>
            <input
              type="date"
              {...register('dueDate')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        )}
      </div>

      {/* Lignes de facture */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Lignes de document</h3>
        
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded-md border border-gray-100">
              
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-500">Produit Catalogue</label>
                <select
                  {...register(`lines.${index}.productId`)}
                  onChange={(e) => {
                    register(`lines.${index}.productId`).onChange(e);
                    handleProductSelect(index, e.target.value);
                  }}
                  className="text-gray-900 mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">-- Ligne libre --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-500">Description</label>
                <input
                  type="text"
                  placeholder="Description personnalisée"
                  {...register(`lines.${index}.description`)}
                  className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 md:col-span-1">
                <label className="block text-xs font-medium text-gray-500">Qté</label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                  className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <label className="block text-xs font-medium text-gray-500">Prix U. HT</label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                  className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="col-span-4 md:col-span-1">
                <label className="block text-xs font-medium text-gray-500">TVA (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register(`lines.${index}.taxRate`, { valueAsNumber: true })}
                  className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="col-span-4 md:col-span-1">
                <label className="block text-xs font-medium text-gray-500">Remise (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register(`lines.${index}.discount`, { valueAsNumber: true })}
                  className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="col-span-4 md:col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50"
                  title="Supprimer la ligne"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {errors.lines && <p className="mt-2 text-sm text-red-600">{errors.lines.message}</p>}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => append({ productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0 })}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            + Ajouter une ligne
          </button>
        </div>
      </div>

      {/* Résumé des totaux */}
      <div className="border-t border-gray-200 pt-6 flex justify-end">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total HT:</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals.totalHT)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total TVA:</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
            <span>Total TTC:</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals.totalTTC)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : (watchType === 'invoice' ? 'Enregistrer la facture' : 'Enregistrer le devis')}
        </button>
      </div>
    </form>
  );
}
