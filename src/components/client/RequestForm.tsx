'use client';

import { Request } from '@/lib/data/interfaces';
import { useState } from 'react';

export default function RequestForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: { 
  initialData?: Partial<Request>, 
  onSubmit: (data: Partial<Request>) => void, 
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState<Partial<Request>>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'other',
    budget: initialData?.budget || undefined,
    location: initialData?.location || '',
    preferredDate: initialData?.preferredDate || '',
  });

  const handleDraft = () => {
    onSubmit({ ...formData, status: 'draft' });
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const finalStatus = (!initialData?.status || initialData.status === 'draft') ? 'published' : initialData.status;
    onSubmit({ ...formData, status: finalStatus });
  };

  return (
    <form onSubmit={handlePublish} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Titre de la demande *</label>
        <input 
          type="text" 
          required 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Ex: Rénovation salle de bain"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description détaillée *</label>
        <textarea 
          required 
          rows={5}
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Décrivez votre besoin en détail..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Catégorie *</label>
          <select 
            required 
            value={formData.category} 
            onChange={e => setFormData({...formData, category: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="artisan">Artisanat & Bâtiment</option>
            <option value="health">Santé & Bien-être</option>
            <option value="freelance">Consultant & Informatique</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Localisation *</label>
          <input 
            type="text" 
            required 
            value={formData.location} 
            onChange={e => setFormData({...formData, location: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Ville ou adresse"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Budget estimé (€)</label>
          <input 
            type="number" 
            value={formData.budget || ''} 
            onChange={e => setFormData({...formData, budget: parseInt(e.target.value) || undefined})}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Ex: 1500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date souhaitée</label>
          <input 
            type="date" 
            value={formData.preferredDate ? new Date(formData.preferredDate).toISOString().split('T')[0] : ''} 
            onChange={e => setFormData({...formData, preferredDate: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-6">
        <button 
          type="button" 
          onClick={onCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
          Annuler
        </button>
        <div className="flex space-x-3">
          {(!initialData?.status || initialData.status === 'draft') && (
            <button 
              type="button" 
              onClick={handleDraft}
              className="bg-white py-2 px-4 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none"
            >
              Enregistrer le brouillon
            </button>
          )}
          <button 
            type="submit" 
            className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
          >
            {(!initialData?.status || initialData.status === 'draft') ? 'Publier la demande' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </form>
  );
}
