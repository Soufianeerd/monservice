'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ContactForm from '@/components/crm/ContactForm';
import * as contactActions from '@/app/actions/contact.actions';
import * as clientActions from '@/app/actions/client.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Contact, Client } from '@/lib/data/interfaces';

export default function EditContactPage(props: { params: Promise<{ id: string, contactId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const [contactData, clientsData] = await Promise.all([
          contactActions.findByIdAction(params.contactId as string, user.organizationId),
          clientActions.findAllAction(user.organizationId)
        ]);

        if (contactData) {
          setContact(contactData);
          setClients(clientsData);
        } else {
          router.push(`/clients/${params.id}/contacts`);
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [params.id, user, router]);

  const handleSubmit = async (data: Partial<Contact>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    const contactId = params.contactId as string;
    try {
      await contactActions.updateAction(contactId, user.organizationId, {
        ...data,
      });

      // activityLog disabled

      router.push(`/clients/${params.id}/contacts`);
    } catch (error) {
      console.error('Erreur lors de la modification', error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!contact) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le contact</h1>
      </div>
      <ContactForm initialData={contact} clients={clients} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
