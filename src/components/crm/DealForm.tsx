'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Deal, Client } from '@/lib/data/interfaces';
import { DEAL_STATUS_LABELS } from '@/lib/constants/statuses';
import * as clientActions from '@/app/actions/client.actions';

import { dealSchema } from '@/lib/validation/schemas';

export type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  initialData?: Deal;
  organizationId: string;
  onSubmit: (data: DealFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function DealForm({ initialData, organizationId, onSubmit, isSubmitting }: DealFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (organizationId) {
      clientActions.findAllAction(organizationId).then(setClients);
    }
  }, [organizationId]);
  
  // Convert date to YYYY-MM-DD for input type="date"
  const formattedDate = initialData?.expectedCloseDate 
    ? new Date(initialData.expectedCloseDate).toISOString().split('T')[0]
    : '';

  const { register, handleSubmit, formState: { errors } } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      value: initialData?.value || 0,
      status: initialData?.status || 'negotiation',
      clientId: initialData?.clientId || '',
      expectedCloseDate: formattedDate,
      notes: initialData?.description || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(data => onSubmit(data))} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border border-gray-200">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom du deal *</label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client *</label>
        <select
          id="clientId"
          {...register('clientId')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
        >
          <option value="">Sélectionner un client...</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700">Valeur (€)</label>
          <input
            type="number"
            id="value"
            {...register('value', { valueAsNumber: true })}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Étape *</label>
          <select
            id="status"
            {...register('status')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            {Object.entries(DEAL_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-700">Date de clôture estimée</label>
        <input
          type="date"
          id="expectedCloseDate"
          {...register('expectedCloseDate')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.expectedCloseDate && <p className="mt-1 text-sm text-red-600">{errors.expectedCloseDate.message}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
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
          {isSubmitting ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  );
}
