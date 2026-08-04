'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import * as messageTemplateActions from '@/app/actions/message-template.actions';
import TemplateForm, { TemplateFormData } from '@/components/crm/TemplateForm';
import { generateId } from '@/lib/utils/id-generator';

export default function NewTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: TemplateFormData) => {
    if (!user?.organizationId) return;
    
    setIsSubmitting(true);
    try {
      await messageTemplateActions.createAction({
        ...data,
        subject: data.subject || '',
        organizationId: user.organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      alert('Modèle créé avec succès !');
      router.push('/templates');
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la création du modèle', error);
      alert('Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Modèle</h1>
        <p className="mt-1 text-sm text-gray-500">
          Créez un nouveau modèle de message réutilisable.
        </p>
      </div>

      <TemplateForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
