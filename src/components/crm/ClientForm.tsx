'use client';

import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/data/interfaces';
import { countries } from '@/lib/constants/countries';
import { industries } from '@/lib/constants/industries';
import { clientSchema } from '@/utils/validation';

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: ClientFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ClientForm({ initialData, onSubmit, isSubmitting }: ClientFormProps) {
  const router = useRouter();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      zipCode: initialData?.zipCode || '',
      website: initialData?.website || '',
      industry: initialData?.industry || '',
      customIndustry: initialData?.customIndustry || '',
      country: initialData?.country || '',
      contactFirstName: initialData?.contactFirstName || '',
      contactLastName: initialData?.contactLastName || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
      contactPosition: initialData?.contactPosition || '',
    }
  });

  const selectedIndustry = watch('industry');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl bg-white p-6 rounded-lg shadow border border-gray-200">
      
      {/* Informations Générales */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de l&apos;entreprise</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom de l&apos;entreprise *</label>
            <input
              type="text"
              id="name"
              data-tour="client-form-name"
              {...register('name')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.name && <p role="alert" className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Secteur d&apos;activité</label>
            <select
              id="industry"
              {...register('industry')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
              <option value="">Sélectionner un secteur...</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            {errors.industry && <p role="alert" className="mt-1 text-sm text-red-600">{errors.industry.message}</p>}
          </div>

          {selectedIndustry === 'Autre' && (
            <div className="sm:col-span-2">
              <label htmlFor="customIndustry" className="block text-sm font-medium text-gray-700">Précisez le secteur</label>
              <input
                type="text"
                id="customIndustry"
                {...register('customIndustry')}
                className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Coordonnées */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Coordonnées</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email générique</label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.email && <p role="alert" className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Téléphone standard</label>
            <input
              type="text"
              id="phone"
              {...register('phone')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresse</label>
            <input
              type="text"
              id="address"
              {...register('address')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">Code postal</label>
            <input
              type="text"
              id="zipCode"
              {...register('zipCode')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ville</label>
            <input
              type="text"
              id="city"
              {...register('city')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">Pays</label>
            <select
              id="country"
              {...register('country')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
              <option value="">Sélectionner un pays...</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {errors.country && <p role="alert" className="mt-1 text-sm text-red-600">{errors.country.message}</p>}
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">Site Web</label>
            <input
              type="text"
              id="website"
              {...register('website')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Contact Principal */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Principal</h3>
        <p className="text-sm text-gray-500 mb-4">Informations sur la personne de référence pour ce client.</p>
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contactFirstName" className="block text-sm font-medium text-gray-700">Prénom</label>
            <input
              type="text"
              id="contactFirstName"
              {...register('contactFirstName')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="contactLastName" className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              id="contactLastName"
              {...register('contactLastName')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Email du contact</label>
            <input
              type="email"
              id="contactEmail"
              {...register('contactEmail')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.contactEmail && <p role="alert" className="mt-1 text-sm text-red-600">{errors.contactEmail.message}</p>}
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">Téléphone du contact</label>
            <input
              type="text"
              id="contactPhone"
              {...register('contactPhone')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="contactPosition" className="block text-sm font-medium text-gray-700">Poste / Fonction</label>
            <input
              type="text"
              id="contactPosition"
              {...register('contactPosition')}
              className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Annuler
        </button>
        <button
          type="submit"
          data-tour="client-form-submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Sauvegarder le client'}
        </button>
      </div>
    </form>
  );
}
