'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ContactForm from '@/components/crm/ContactForm';
import { contactRepository, clientRepository, activityLogRepository } from '@/lib/data';
import { generateId } from '@/lib/utils/id-generator';
import { Contact, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const [c, clientsData] = await Promise.all([
        contactRepository.getById(params.id as string),
        clientRepository.findByOrganization(user.organizationId)
      ]);
      
      if (c && c.organizationId === user.organizationId) {
        setContact(c);
        setClients(clientsData);
      } else {
        router.push('/contacts');
      }
      setLoading(false);
    }
    load();
  }, [params.id, user, router]);

  const handleSubmit = async (data: Partial<Contact>) => {
    setIsSubmitting(true);
    const id = params?.id as string;
    if (!id) return;
    try {
      await contactRepository.update(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      if (user) {
        await activityLogRepository.create({
          organizationId: user.organizationId || '',
          userId: user.id,
          action: 'UPDATE',
          entityType: 'CONTACT',
          entityId: id,
          details: `Mise à jour du contact ${data.firstName} ${data.lastName}`,
          createdAt: new Date().toISOString(),
        });
      }

      router.push('/contacts');
    } catch (error) {
      console.error('Erreur', error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!contact) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le contact</h1>
      </div>
      <ContactForm initialData={contact} clients={clients} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
