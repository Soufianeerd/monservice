'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ContactForm from '@/components/crm/ContactForm';
import * as contactActions from '@/app/actions/contact.actions';
import * as clientActions from '@/app/actions/client.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Contact, Client } from '@/lib/data/interfaces';

export default function NewContactPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.organizationId) {
      clientActions.findAllAction(user.organizationId).then(setClients);
    }
  }, [user]);

  const handleSubmit = async (data: Partial<Contact>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    try {
      const newContact = await contactActions.createAction({
        firstName: data.firstName || 'Nouveau',
        lastName: data.lastName || 'Contact',
        email: data.email || '',
        phone: data.phone || '',
        position: data.position || '',
        clientId: data.clientId || '',
        organizationId: user.organizationId,
      });

      // activityLog disabled

      alert('Contact créé !');
      router.push('/contacts');
    } catch (error) {
      console.error('Erreur', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajouter un contact</h1>
        <p className="mt-1 text-sm text-gray-500">Remplissez les informations du nouveau contact.</p>
      </div>
      <ContactForm clients={clients} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
