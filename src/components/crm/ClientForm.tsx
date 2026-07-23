'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/data/interfaces';

import { clientSchema } from '@/utils/validation';

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: ClientFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ClientForm({ initialData, onSubmit, isSubmitting }: ClientFormProps) {
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      industry: initialData?.industry || '',
      country: initialData?.country || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border border-gray-200">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom du client *</label>
        <input
          type="text"
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          className={`text-gray-900 mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
        {errors.name && <p role="alert" className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          id="email"
          {...register('email')}
          aria-invalid={!!errors.email}
          className={`text-gray-900 mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
        {errors.email && <p role="alert" className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
        <input
          type="text"
          id="phone"
          {...register('phone')}
          aria-invalid={!!errors.phone}
          className={`text-gray-900 mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
        {errors.phone && <p role="alert" className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresse</label>
        <input
          type="text"
          id="address"
          {...register('address')}
          aria-invalid={!!errors.address}
          className={`text-gray-900 mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${errors.address ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
        {errors.address && <p role="alert" className="mt-1 text-sm text-red-600">{errors.address.message}</p>}
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Secteur d&apos;activité</label>
        <input
          type="text"
          id="industry"
          {...register('industry')}
          aria-invalid={!!errors.industry}
          className={`text-gray-900 mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${errors.industry ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
        {errors.industry && <p role="alert" className="mt-1 text-sm text-red-600">{errors.industry.message}</p>}
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700">Pays</label>
        <input
          type="text"
          id="country"
          {...register('country')}
          aria-invalid={!!errors.country}
          className={`text-gray-900 mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${errors.country ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
        />
        {errors.country && <p role="alert" className="mt-1 text-sm text-red-600">{errors.country.message}</p>}
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
