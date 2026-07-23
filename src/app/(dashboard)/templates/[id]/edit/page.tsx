'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { messageTemplateRepository } from '@/lib/data';
import { MessageTemplate } from '@/lib/data/interfaces';
import TemplateForm, { TemplateFormData } from '@/components/crm/TemplateForm';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [template, setTemplate] = useState<MessageTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadTemplate() {
      if (!id) return;
      try {
        const data = await messageTemplateRepository.getById(id);
        if (data) setTemplate(data);
        else router.push('/templates');
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [id, router]);

  const handleSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      await messageTemplateRepository.update(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      alert('Modèle mis à jour !');
      router.push('/templates');
      router.refresh();
    } catch (error) {
      console.error('Erreur', error);
      alert('Erreur lors de la mise à jour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (!template) return <div className="p-8 text-center text-red-500">Modèle introuvable</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Modifier Modèle</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mise à jour du modèle {template.name}
        </p>
      </div>

      <TemplateForm initialData={template} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
