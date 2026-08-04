'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import * as invoiceActions from '@/app/actions/invoice.actions';

import { Invoice, Request } from '@/lib/data/interfaces';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { use } from 'react';
import * as requestActions from '@/app/actions/request.actions';

export default function QuoteSentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Invoice | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.organizationId) return;
      try {
        const q = await invoiceActions.getByIdAction(id);
        if (q && q.organizationId === user.organizationId && q.type === 'quote') {
          setQuote(q);
          if (q.requestId) {
            const req = await requestActions.findByIdAction(q.requestId);
            setRequest(req || null);
          }
        } else {
          router.push('/quotes');
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [id, user, router]);

  const handleCancel = async () => {
    if (!user?.organizationId || !quote) return;
    if (confirm("Voulez-vous annuler ce devis ? Il n'y aura plus de suite.")) {
      try {
        await invoiceActions.updateAction(quote.id, user.organizationId, { status: 'cancelled' });
        if (quote.requestId) {
          await requestActions.updateAction(quote.requestId, { status: 'published' });
        }
        setQuote({ ...quote, status: 'cancelled' });
      } catch (error) {
        console.error('Erreur', error);
      }
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (!quote) return <div className="p-6">Devis non trouvé</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/quotes" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 mb-2 inline-block">&larr; Retour aux devis envoyés</Link>
          <h1 className="text-2xl font-bold text-gray-900">Devis n° {quote.number}</h1>
          <p className="text-sm text-gray-500 mt-1">Envoyé le {format(new Date(quote.createdAt), 'PP', { locale: fr })}</p>
        </div>
        <div>
          {quote.status === 'sent' || quote.status === 'viewed' ? (
            <button 
              onClick={handleCancel}
              className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-gray-50"
            >
              Annuler le devis
            </button>
          ) : (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${quote.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {quote.status === 'paid' ? 'Accepté par le client' : 'Refusé / Annulé'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations du devis</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Montant HT</span>
                <span className="font-medium">{quote.totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVA (20%)</span>
                <span className="font-medium">{quote.taxAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-900 font-bold">Total TTC</span>
                <span className="font-bold text-indigo-600">{quote.totalTTC.toFixed(2)} €</span>
              </div>
            </div>
            
            {quote.message && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Message envoyé au client :</h4>
                <p className="text-sm text-gray-600 italic">"{quote.message}"</p>
              </div>
            )}
          </CardBody>
        </Card>

        {request && (
          <Card>
            <CardBody>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Demande associée</h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-indigo-600">
                  <Link href={`/marketplace/${request.id}`} className="hover:underline">
                    {request.title}
                  </Link>
                </p>
                <p className="text-sm text-gray-500">Catégorie : {request.category}</p>
                <p className="text-sm text-gray-500">Lieu : {request.location}</p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
