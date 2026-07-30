'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Request, Invoice } from '@/lib/data/interfaces';

import { invoiceService } from '@/lib/services/invoice.service';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { requestService } from '@/lib/services/request.service';

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  
  const [request, setRequest] = useState<Request | null>(null);
  const [quotes, setQuotes] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const req = await requestService.findById(id);
      if (req && req.clientId === user?.id) {
        setRequest(req);
        const allInvoices = await invoiceService.findByClient(user.id);
        setQuotes(allInvoices.filter(inv => inv.type === 'quote' && inv.requestId === id));
      }
    };
    if (user?.id) fetchData();
  }, [id, user]);

  if (!request) return <div>Chargement...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
        <div className="space-x-3 flex items-center">
          {request.status !== 'published' && (
            <button 
              onClick={async () => {
                if(window.confirm('Voulez-vous vraiment publier cette demande ?')) {
                  await requestService.publish(request.id, user?.id || '');
                  alert('Demande publiée !');
                  window.location.reload();
                }
              }}
              className="bg-indigo-600 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700">
              Publier
            </button>
          )}
          <Link href={`/client/requests/${request.id}/edit`} className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Modifier</Link>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request.description}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Statut</h3>
                <p className="mt-1 text-sm font-medium text-gray-900">{request.status}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Localisation</h3>
                <p className="mt-1 text-sm text-gray-900">{request.location}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Budget estimé</h3>
                <p className="mt-1 text-sm text-gray-900">{request.budget ? `${request.budget} €` : 'Non spécifié'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date souhaitée</h3>
                <p className="mt-1 text-sm text-gray-900">{request.preferredDate ? format(new Date(request.preferredDate), 'PP', { locale: fr }) : 'Non spécifiée'}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Devis reçus</h2>
        {quotes.length === 0 ? (
          <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-md border border-gray-200 border-dashed">Aucun devis reçu pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {quotes.map(quote => (
              <Card key={quote.id}>
                <CardBody>
                  <div className="flex justify-between items-center p-2">
                    <div>
                      <p className="font-medium text-gray-900">Devis n° {quote.number}</p>
                      <p className="text-sm text-gray-500">{quote.totalTTC} € TTC • Reçu le {format(new Date(quote.createdAt), 'PP', { locale: fr })}</p>
                    </div>
                    <Link href={`/client/quotes/${quote.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-sm font-medium bg-indigo-50 px-3 py-1.5 rounded-md">
                      Voir le devis
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
