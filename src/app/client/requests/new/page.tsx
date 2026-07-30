'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Request } from '@/lib/data/interfaces';

import RequestForm from '@/components/client/RequestForm';
import { useRouter } from 'next/navigation';
import { requestService } from '@/lib/services/request.service';

export default function NewRequestPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (data: Partial<Request>) => {
    if (!user?.id) return;
    
    await requestService.create({
      title: data.title!,
      description: data.description!,
      category: data.category!,
      budget: data.budget,
      location: data.location!,
      preferredDate: data.preferredDate,
      status: 'draft',
      clientId: user.id
    }, user.id);
    
    router.push('/client/requests');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande</h1>
        <p className="text-gray-500">Renseignez les détails pour obtenir des devis pertinents.</p>
      </div>

      <Card>
        <CardBody>
          <RequestForm 
            onSubmit={handleSubmit} 
            onCancel={() => router.push('/client/requests')} 
          />
        </CardBody>
      </Card>
    </div>
  );
}
