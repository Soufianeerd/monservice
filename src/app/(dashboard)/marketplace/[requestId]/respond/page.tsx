'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useEffect, useState, use } from 'react';
import { RequestStatus } from '@/lib/data/interfaces';
import { invoiceService } from '@/lib/services/invoice.service';
import { Request } from '@/lib/data/interfaces';
import { invoiceRepository  } from '@/lib/data/repositories';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RespondToRequestForm from '@/components/marketplace/RespondToRequestForm';
import { Card, CardBody } from '@/components/ui/Card';
import { generateId } from '@/lib/utils/id-generator';
import { requestService } from '@/lib/services/request.service';

export default function RespondToRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const resolvedParams = use(params);
  const requestId = resolvedParams.requestId;
  const { user } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    requestService.findById(requestId).then(req => {
      setRequest(req || null);
    });
  }, [requestId]);

  const handleSubmit = async (data: { amount: number, message: string }) => {
    if (!user?.organizationId || !request) return;
    setLoading(true);
    
    try {
      // Check if already responded
      const existingInvoices = await invoiceRepository.findByProfessional(user.organizationId);
      const alreadyResponded = existingInvoices.some(inv => inv.requestId === request.id);
      
      if (alreadyResponded) {
        setError("Vous avez déjà envoyé un devis pour cette demande.");
        setLoading(false);
        return;
      }

      const nextNumber = await invoiceService.getNextInvoiceNumber(user.organizationId, 'quote');

      const lines = [{
        description: "Prestation : " + request.title,
        quantity: 1,
        unitPrice: data.amount,
        taxRate: 20,
        discount: 0,
        amountHT: data.amount,
        amountTTC: data.amount * 1.2
      }];

      await invoiceService.create({
        type: 'quote',
        number: nextNumber,
        date: new Date().toISOString(),
        status: 'sent',
        clientId: request.clientId,
        organizationId: user.organizationId,
        totalHT: data.amount,
        taxAmount: data.amount * 0.2,
        totalTTC: data.amount * 1.2,
        message: data.message,
        requestId: request.id,
      }, lines as any);
      
      // In a real app, notify client here
      alert("Devis envoyé avec succès au client !");
      router.push('/quotes');
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue.");
      setLoading(false);
    }
  };

  if (!request) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-6">
      <div>
        <Link href={`/marketplace/${request.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 mb-2 inline-block">&larr; Retour à la demande</Link>
        <h1 className="text-2xl font-bold text-gray-900">Répondre à la demande</h1>
        <p className="text-sm text-gray-500 mt-1">Demande : {request.title}</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardBody>
          <RespondToRequestForm request={request} onSubmit={handleSubmit} loading={loading} />
        </CardBody>
      </Card>
    </div>
  );
}
