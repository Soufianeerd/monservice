'use client';

import { User } from '@/lib/data/interfaces';
import { useState } from 'react';

export default function ClientProfileForm({ user, onSubmit }: { user: User, onSubmit: (data: Partial<User>) => void }) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nom complet</label>
        <input 
          type="text" 
          required
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Adresse email</label>
        <input 
          type="email" 
          value={formData.email} 
          disabled
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">L'adresse email est votre identifiant et ne peut pas être modifiée.</p>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <button 
          type="submit" 
          className="w-full sm:w-auto bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-6 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Enregistrer les modifications
        </button>
      </div>
    </form>
  );
}
