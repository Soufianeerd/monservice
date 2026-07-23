'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { MessageTemplate } from '@/lib/data/interfaces';

const templateSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  type: z.enum(['email', 'sms']),
  subject: z.string().optional(),
  body: z.string().min(10, "Le corps du message est trop court"),
}).superRefine((data, ctx) => {
  if (data.type === 'email' && (!data.subject || data.subject.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "L'objet est requis pour un email",
      path: ["subject"],
    });
  }
});

export type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  initialData?: MessageTemplate;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function TemplateForm({ initialData, onSubmit, isSubmitting }: TemplateFormProps) {
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'email',
      subject: initialData?.subject || '',
      body: initialData?.body || '',
    }
  });

  const type = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border border-gray-200">
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nom du modèle *</label>
        <input
          type="text"
          {...register('name')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Type de message *</label>
        <select
          {...register('type')}
          className="text-gray-900 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      {type === 'email' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Objet de l'email *</label>
          <input
            type="text"
            {...register('subject')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Corps du message *</label>
        <p className="text-xs text-gray-500 mb-2">Variables disponibles : {'{{clientName}}, {{invoiceNumber}}, {{amount}}, {{dueDate}}'}</p>
        <textarea
          {...register('body')}
          rows={8}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer le modèle'}
        </button>
      </div>
    </form>
  );
}
