'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/data/interfaces';

import { productSchema } from '@/utils/validation';

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    // @ts-ignore Zod coerce input type mismatch
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      unitPrice: initialData?.unitPrice || 0,
      taxRate: initialData?.taxRate ?? 20, // Default 20%
    }
  });

  return (
    <form onSubmit={handleSubmit(data => onSubmit(data as any))} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border border-gray-200">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom du produit/service *</label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description *</label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">Prix unitaire HT (€) *</label>
          <input
            type="number"
            step="0.01"
            id="unitPrice"
            {...register('unitPrice', { valueAsNumber: true })}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.unitPrice && <p className="mt-1 text-sm text-red-600">{errors.unitPrice.message}</p>}
        </div>

        <div>
          <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">Taux de TVA (%) *</label>
          <input
            type="number"
            step="0.01"
            id="taxRate"
            {...register('taxRate', { valueAsNumber: true })}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.taxRate && <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>}
        </div>
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
