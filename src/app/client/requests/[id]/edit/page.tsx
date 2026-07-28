'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Request } from '@/lib/data/interfaces';
import { requestRepository } from '@/lib/data/repositories';
import RequestForm from '@/components/client/RequestForm';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';

export default function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    requestRepository.findById(id).then(req => {
      if (req && req.clientId === user?.id) {
        setRequest(req);
      }
    });
  }, [id, user]);

  const handleSubmit = async (data: Partial<Request>) => {
    await requestRepository.update(id, data);
    router.push('/client/requests');
  };

  if (!request) return <div>Chargement...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier la demande</h1>
      </div>

      <Card>
        <CardBody>
          <RequestForm 
            initialData={request}
            onSubmit={handleSubmit} 
            onCancel={() => router.push('/client/requests')} 
          />
        </CardBody>
      </Card>
    </div>
  );
}
