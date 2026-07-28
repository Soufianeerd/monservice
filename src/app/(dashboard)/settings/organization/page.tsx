'use client';

import React, { useEffect, useState } from 'react';
import OrganizationForm from '@/components/crm/OrganizationForm';
import { useAuth } from '@/components/auth/AuthContext';
import { organizationRepository } from '@/lib/data/repositories/organization.repository';
import { Organization } from '@/lib/data/interfaces';
import Skeleton from '@/components/crm/Skeleton';
import StripeConnectButton from '@/components/settings/StripeConnectButton';

export default function OrganizationSettingsPage() {
  const { user, organization } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSubmit: React.ComponentProps<typeof OrganizationForm>['onSubmit'] = async (data, logo) => {
    if (!currentOrg) return;
    setSaving(true);
    setMessage(null);
    try {
      const updatedOrg = {
        ...currentOrg,
        ...data,
        logo: logo || currentOrg.logo,
        updatedAt: new Date().toISOString(),
      };
      await organizationRepository.update(currentOrg.id, updatedOrg);
      setCurrentOrg(updatedOrg);
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
          Organisation introuvable. Veuillez contacter le support.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Profil de l&apos;entreprise</h1>
      <p className="text-gray-600 mt-2 mb-6">
        Gérez les informations légales et commerciales de votre entreprise. Ces
        informations apparaîtront sur vos devis et factures.
      </p>

      {message && (
        <div
          className={`p-4 rounded mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <OrganizationForm
        initialData={currentOrg}
        onSubmit={handleSubmit}
        isSubmitting={saving}
      />

      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Paiements & Facturation</h2>
        <p className="text-gray-600 mb-6">
          Connectez votre compte Stripe pour pouvoir recevoir des paiements en ligne de la part de vos clients.
        </p>
        <StripeConnectButton organizationId={currentOrg.id} isConnected={!!currentOrg.stripeAccountId} />
      </div>
    </div>
  );
}
