'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Contact, Client } from '@/lib/data/interfaces';

import { contactSchema } from '@/utils/validation';

export type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: Contact;
  clients: Client[];
  onSubmit: (data: ContactFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ContactForm({ initialData, clients, onSubmit, isSubmitting }: ContactFormProps) {
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      position: initialData?.position || '',
      clientId: initialData?.clientId || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Prénom *</label>
          <input
            type="text"
            id="firstName"
            {...register('firstName')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nom *</label>
          <input
            type="text"
            id="lastName"
            {...register('lastName')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
        </div>
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            {...register('email')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone</label>
          <input
            type="text"
            id="phone"
            {...register('phone')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="position" className="block text-sm font-medium text-gray-700">Fonction / Poste</label>
        <input
          type="text"
          id="position"
          {...register('position')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
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
