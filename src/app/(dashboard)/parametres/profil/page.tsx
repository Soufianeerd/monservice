'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { User } from '@/lib/data/interfaces';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  if (!user) return null;

  return <ProfileForm user={user} updateUser={updateUser} />;
}

function ProfileForm({ user, updateUser }: { user: User; updateUser: (data: Partial<User>) => Promise<void> }) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setIsSubmitting(true);

    await updateUser({
      name,
      email,
      ...(password ? { password } : {})
    });

    setIsSubmitting(false);
    setSuccessMsg('Profil mis à jour avec succès.');
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {successMsg}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <div className="mt-1">
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-gray-900 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-gray-900 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Laisser vide pour ne pas modifier"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-gray-900 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
