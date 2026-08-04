'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Task, User } from '@/lib/data/interfaces';

import { taskSchema } from '@/utils/validation';

export type TaskFormData = z.infer<typeof taskSchema>;
export type TaskFormInput = z.input<typeof taskSchema>;

interface TaskFormProps {
  initialData?: Task;
  users: User[];
  onSubmit: SubmitHandler<TaskFormData>;
  isSubmitting?: boolean;
}

export default function TaskForm({ initialData, users, onSubmit, isSubmitting }: TaskFormProps) {
  const router = useRouter();
  
  const formattedDate = initialData?.dueDate 
    ? new Date(initialData.dueDate).toISOString().split('T')[0]
    : '';

  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormInput, undefined, TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'todo',
      priority: initialData?.priority || 'medium',
      assignedTo: initialData?.assignedTo || '',
      dueDate: formattedDate,
      entityType: initialData?.entityType || '',
      entityId: initialData?.entityId || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border border-gray-200">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre *</label>
        <input
          type="text"
          id="title"
          {...register('title')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.title && <p role="alert" className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.description && <p role="alert" className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Statut *</label>
          <select
            id="status"
            {...register('status')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="pending">En attente</option>
            <option value="completed">Terminé</option>
          </select>
          {errors.status && <p role="alert" className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priorité *</label>
          <select
            id="priority"
            {...register('priority')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
          {errors.priority && <p role="alert" className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="entityType" className="block text-sm font-medium text-gray-700">Lier à (Type)</label>
          <select
            id="entityType"
            {...register('entityType')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            <option value="">Aucun lien</option>
            <option value="client">Client</option>
            <option value="contact">Contact</option>
            <option value="deal">Deal</option>
            <option value="invoice">Facture</option>
            <option value="quote">Devis</option>
          </select>
          {errors.entityType && <p role="alert" className="mt-1 text-sm text-red-600">{errors.entityType?.message}</p>}
        </div>

        <div>
          <label htmlFor="entityId" className="block text-sm font-medium text-gray-700">ID de l&apos;entité liée</label>
          <input
            type="text"
            id="entityId"
            {...register('entityId')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.entityId && <p role="alert" className="mt-1 text-sm text-red-600">{errors.entityId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Assigné à</label>
          <select
            id="assignedTo"
            {...register('assignedTo')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            <option value="">Non assigné</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          {errors.assignedTo && <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>}
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Date d&apos;échéance</label>
          <input
            type="date"
            id="dueDate"
            {...register('dueDate')}
            className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>}
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
