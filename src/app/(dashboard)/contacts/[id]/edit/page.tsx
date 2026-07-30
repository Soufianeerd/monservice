'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ContactForm from '@/components/crm/ContactForm';
import { activityLogRepository } from '@/lib/data';
import { contactService } from '@/lib/services/contact.service';
import { clientService } from '@/lib/services/client.service';
import { useAuth } from '@/components/auth/AuthContext';
import { Contact, Client } from '@/lib/data/interfaces';

export default function EditContactPage({ params }: { params: { id: string } }) {
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
          contactService.findById(params.id as string, user.organizationId),
          clientService.findAll(user.organizationId)
        ]);

        if (contactData) {
          setContact(contactData);
          setClients(clientsData);
        } else {
          router.push('/contacts');
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
    const id = params.id as string;
    try {
      await contactService.update(id, user.organizationId, {
        ...data,
      });

      await activityLogRepository.create({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'CONTACT',
        entityId: id,
        details: `Mise à jour du contact ${data.firstName} ${data.lastName}`,
        createdAt: new Date().toISOString(),
      });

      router.push('/contacts');
    } catch (error) {
      console.error('Erreur lors de la modification', error);
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
