'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useEffect, useState, use } from 'react';
import { Request } from '@/lib/data/interfaces';
import { requestRepository } from '@/lib/data/repositories';
import { Card, CardBody } from '@/components/ui/Card';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPinIcon, CalendarIcon, CoinsIcon, BriefcaseIcon } from 'lucide-react';

export default function RequestMarketplaceDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const resolvedParams = use(params);
  const requestId = resolvedParams.requestId;
  const { user } = useAuth();
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    requestRepository.findById(requestId).then(req => {
      // In a real app, verify that the request is public and not owned by the user.
      if (req) {
        setRequest(req);
      }
    });
  }, [requestId]);

  if (!request) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/marketplace" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 mb-2 inline-block">&larr; Retour à la marketplace</Link>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <p className="text-sm text-gray-500 mt-1">Publiée le {format(new Date(request.createdAt), 'PP', { locale: fr })}</p>
        </div>
        <Link 
          href={`/marketplace/${request.id}/respond`} 
          className="bg-indigo-600 px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700"
        >
          Envoyer un devis
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="flex items-center text-sm text-gray-700">
              <BriefcaseIcon className="w-5 h-5 mr-2 text-gray-400" />
              {request.category}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <MapPinIcon className="w-5 h-5 mr-2 text-gray-400" />
              {request.location}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <CoinsIcon className="w-5 h-5 mr-2 text-gray-400" />
              {request.budget ? `${request.budget} €` : 'À définir'}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <CalendarIcon className="w-5 h-5 mr-2 text-gray-400" />
              {request.preferredDate ? format(new Date(request.preferredDate), 'PP', { locale: fr }) : 'Non défini'}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Détails de la demande</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
