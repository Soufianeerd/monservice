'use client';
import { getByIdAction, updateAction } from '@/app/actions/organization.actions';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft, Trash2 } from 'lucide-react';
import * as dealActions from '@/app/actions/deal.actions';
import * as clientActions from '@/app/actions/client.actions';
import { Deal, Client } from '@/lib/data/interfaces';
import { DEAL_STATUS_LABELS } from '@/lib/constants/statuses';
import { useAuth } from '@/components/auth/AuthContext';

export default function DealDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const d = await dealActions.findByIdAction(params.id as string, user.organizationId);
        if (d) {
          setDeal(d);
          if (d.clientId) {
            const cli = await clientActions.findByIdAction(d.clientId, user.organizationId);
            setClient(cli);
          }
        } else {
          router.push('/deals');
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [params.id, user, router]);

  const handleDelete = async () => {
    if (!user?.organizationId) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce deal ?")) return;
    try {
      await dealActions.deleteAction(params.id as string, user.organizationId);
      router.push('/deals');
    } catch (error) {
      console.error('Erreur', error);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!deal) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDelete} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </button>
          
          <button 
            onClick={async () => {
              try {
                const { generateQuotePDF, downloadPDF } = await import('@/lib/utils/pdf-generator');
                const org = await import('@/app/actions/organization.actions').then(m => m.getByIdAction(deal.organizationId));
                if (!org) throw new Error('Organization not found');
                const blob = await generateQuotePDF(deal, org, client as any);
                downloadPDF(blob, `Devis_${deal.name}.pdf`);
              } catch (err) {
                console.error(err);
                alert('Erreur lors de la génération du PDF');
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Télécharger PDF
          </button>

          <button 
            onClick={() => {
              import('@/lib/email').then(({ sendEmail }) => {
                sendEmail({ to: client?.email || '', subject: `Devis: ${deal.name}` });
                alert('Devis envoyé par email avec succès ! (Simulation)');
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Envoyer par email
          </button>

          <Link href={`/deals/${deal.id}/edit`} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Détails du deal</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nom</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{deal.name}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {client.name}
                  </Link>
                ) : '-'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Valeur</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(deal.value)}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Étape</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {DEAL_STATUS_LABELS[deal.status]}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date de clôture estimée</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {deal.expectedCloseDate ? new Intl.DateTimeFormat('fr-FR').format(new Date(deal.expectedCloseDate)) : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Signature Section */}
      {deal.signature ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Signature</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <p className="text-sm text-gray-500 mb-2">Signé le {new Date(deal.signedAt || '').toLocaleString('fr-FR')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={deal.signature} alt="Signature" className="max-w-[400px] border border-gray-200 rounded" />
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Signer le devis</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="max-w-[400px]">
              <SignaturePadWrapper dealId={deal.id} onSignSuccess={(updatedDeal) => setDeal(updatedDeal)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignaturePadWrapper({ dealId, onSignSuccess }: { dealId: string, onSignSuccess: (deal: Deal) => void }) {
  const [SignaturePad, setSignaturePad] = useState<any>(null);
  
  useEffect(() => {
    import('@/components/crm/SignaturePad').then(mod => setSignaturePad(() => mod.default));
  }, []);

  if (!SignaturePad) return <div>Chargement...</div>;

  return (
    <SignaturePad 
      onSave={async (signatureData: string) => {
        try {
          const res = await fetch('/api/deals/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dealId, signatureData })
          });
          const data = await res.json();
          if (res.ok) {
            onSignSuccess(data.deal);
            alert('Devis signé avec succès !');
          } else {
            alert(data.error || 'Erreur lors de la signature');
          }
        } catch (e) {
          console.error(e);
          alert('Erreur réseau');
        }
      }}
    />
  );
}
