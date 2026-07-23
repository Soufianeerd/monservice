'use client';

import React, { useEffect, useState } from 'react';
import OrganizationForm from '@/components/crm/OrganizationForm';
import { useAuth } from '@/components/auth/AuthContext';
import { organizationRepository } from '@/lib/data/repositories/organization.repository';
import { Organization } from '@/lib/data/interfaces';
import Skeleton from '@/components/crm/Skeleton';

export default function OrganizationSettingsPage() {
  const { user, organization } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (organization?.id) {
        const data = await organizationRepository.getById(organization.id);
        setCurrentOrg(data || null);
      }
      setLoading(false);
    }
    loadData();
  }, [organization]);

  const handleSubmit = async (data: any, logo?: string) => {
    if (!currentOrg) return;
    setSaving(true);
    setMessage(null);

    try {
      const updatedOrg = {
        ...currentOrg,
        ...data,
        logo: logo || currentOrg.logo,
        updatedAt: new Date().toISOString()
      };

      await organizationRepository.update(currentOrg.id, updatedOrg);
      setCurrentOrg(updatedOrg);
      
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
      
      // Auto-hide success message
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow space-y-8">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        Organisation introuvable.
      </div>
    );
  }

  // Only admins or the owner should ideally see this, but for now we let users see it
  // In a real app we'd check user.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil de l'entreprise</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les informations légales et commerciales de votre entreprise. Ces informations apparaîtront sur vos devis et factures.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <OrganizationForm 
        initialData={currentOrg} 
        onSubmit={handleSubmit} 
        isSubmitting={saving} 
      />
    </div>
  );
}
