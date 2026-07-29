'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import ClientProfileForm from '@/components/client/ClientProfileForm';
import { userService } from '@/lib/services/user.service';
import { useState } from 'react';

export default function ClientProfilePage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const handleSubmit = async (data: any) => {
    if (user?.id) {
      await userService.updateUserProfile(user.id, data);
      setMessage('Profil mis à jour avec succès. (Rechargez la page pour voir les changements dans le menu)');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500">Gérez vos informations personnelles.</p>
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {message}
        </div>
      )}

      <Card>
        <CardBody>
          <ClientProfileForm user={user} onSubmit={handleSubmit} />
        </CardBody>
      </Card>
    </div>
  );
}
