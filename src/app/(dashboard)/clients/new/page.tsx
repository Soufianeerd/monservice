'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientForm from '@/components/crm/ClientForm';
import * as clientActions from '@/app/actions/client.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Client } from '@/lib/data/interfaces';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<Client>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    try {
      const newClient = await clientActions.createAction({
        name: data.name || 'Nouveau Client',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        zipCode: data.zipCode || '',
        website: data.website || '',
        industry: data.industry || '',
        customIndustry: data.customIndustry || '',
        country: data.country || '',
        contactFirstName: data.contactFirstName || '',
        contactLastName: data.contactLastName || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        contactPosition: data.contactPosition || '',
        organizationId: user.organizationId,
      });
      
      // activityLog disabled

      alert('Client créé avec succès !');
      router.push('/clients');
    } catch (error) {
      console.error('Erreur lors de la création du client', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajouter un client</h1>
        <p className="mt-1 text-sm text-gray-500">Remplissez les informations du nouveau client.</p>
      </div>
      <ClientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
