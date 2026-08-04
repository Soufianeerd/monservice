'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useEffect, useState } from 'react';
import { Request } from '@/lib/data/interfaces';

import RequestList from '@/components/client/RequestList';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import * as requestActions from '@/app/actions/request.actions';

export default function ClientRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    if (user?.id) {
      requestActions.findByClientIdAction(user.id).then(setRequests);
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
      await requestActions.deleteAction(id);
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
          <p className="text-gray-500">Gérez vos demandes de services et de devis.</p>
        </div>
        <Link 
          href="/client/requests/new" 
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Nouvelle demande
        </Link>
      </div>

      <Card>
        <CardBody>
          <RequestList requests={requests} onDelete={handleDelete} />
        </CardBody>
      </Card>
    </div>
  );
}
