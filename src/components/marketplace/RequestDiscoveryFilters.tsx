'use client';

import { useState } from 'react';

export interface DiscoveryFilters {
  category?: string;
  location?: string;
  minBudget?: number;
  maxBudget?: number;
}

export default function RequestDiscoveryFilters({ onFilterChange }: { onFilterChange: (filters: DiscoveryFilters) => void }) {
  const [filters, setFilters] = useState<DiscoveryFilters>({});

  const handleChange = (key: keyof DiscoveryFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    // Remove empty strings or undefined
    if (newFilters[key] === '' || newFilters[key] === undefined || Number.isNaN(newFilters[key])) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
        <select 
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-2 px-3"
          value={filters.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          <option value="artisan">Artisanat & Bâtiment</option>
          <option value="health">Santé & Bien-être</option>
          <option value="freelance">Consultant & Informatique</option>
          <option value="other">Autre</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Localisation</label>
        <input 
          type="text" 
          placeholder="Ville ou code postal"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-2 px-3"
          value={filters.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
        />
      </div>

      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Budget Min (€)</label>
        <input 
          type="number" 
          placeholder="Ex: 500"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-2 px-3"
          value={filters.minBudget || ''}
          onChange={(e) => handleChange('minBudget', parseInt(e.target.value))}
        />
      </div>

      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Budget Max (€)</label>
        <input 
          type="number" 
          placeholder="Ex: 5000"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border py-2 px-3"
          value={filters.maxBudget || ''}
          onChange={(e) => handleChange('maxBudget', parseInt(e.target.value))}
        />
      </div>
    </div>
  );
}
