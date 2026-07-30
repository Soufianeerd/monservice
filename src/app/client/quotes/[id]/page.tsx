'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Invoice, Request } from '@/lib/data/interfaces';

import { invoiceService } from '@/lib/services/invoice.service';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState, use } from 'react';
import { generateQuotePDF, downloadPDF } from '@/lib/utils/pdf-generator';
import { DownloadIcon } from 'lucide-react';
import { organizationRepository } from '@/lib/data';
import { requestService } from '@/lib/services/request.service';

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  
  const [quote, setQuote] = useState<Invoice | null>(null);
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      const q = await invoiceService.getById(id);
      if (q && q.clientId === user.id && q.type === 'quote') {
        setQuote(q);
        // Mark as viewed if it was just sent
        if (q.status === 'sent') {
          // This requires pro organizationId but wait, client does not know it
          // We can use the professionalId / organizationId of the quote!
          await invoiceService.update(q.id, q.organizationId, { status: 'viewed' });
        }
        
        if (q.requestId) {
          const req = await requestService.findById(q.requestId);
          setRequest(req || null);
        }
      }
    };
    if (user) {
      fetchData();
    }
  }, [id, user]);

  const handleAccept = async () => {
    if (!quote) return;
    router.push(`/quotes/${quote.id}/sign`);
  };

  const handleDecline = async () => {
    if (!quote) return;
    if (confirm('Êtes-vous sûr de vouloir refuser ce devis ?')) {
      await invoiceService.update(quote.id, quote.organizationId, { status: 'cancelled' });
      setQuote({ ...quote, status: 'cancelled' });
    }
  };

  const handleDownload = async () => {
    if (quote && user?.organizationId) {
      try {
        const org = await organizationRepository.getById(user.organizationId) || await organizationRepository.getById(quote.organizationId);
        if (!org) return;
        const client = { name: user.name || 'Client', email: user.email };
        const blob = await generateQuotePDF(quote as any, org, client);
        downloadPDF(blob, `Devis_${quote.number}.pdf`);
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        alert('Erreur lors de la génération du PDF');
      }
    }
  };

  if (!quote) return <div>Chargement...</div>;

  const isPending = quote.status === 'sent' || quote.status === 'viewed';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis {quote.number}</h1>
          <p className="text-gray-500">Émis le {format(new Date(quote.createdAt), 'PP', { locale: fr })}</p>
        </div>
        {isPending && (
          <div className="flex space-x-3">
            <button 
              onClick={handleDecline}
              className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refuser
            </button>
            <button 
              onClick={handleAccept}
              className="bg-indigo-600 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700"
            >
              Accepter le devis
            </button>
            <button 
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DownloadIcon className="w-5 h-5 mr-2" />
              Télécharger PDF
            </button>
          </div>
        )}
        {!isPending && (
          <button 
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Télécharger PDF
          </button>
        )}
      </div>

      <Card>
        <CardBody>
          {request && (
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Lié à la demande :</h3>
              <p className="mt-1 text-sm font-medium text-gray-900">{request.title}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total HT</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quote.lines.map((line: any, idx: number) => (
                  <tr key={line.id || idx}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {line.description || 'Service/Produit'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{line.quantity}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{line.unitPrice} €</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{line.quantity * line.unitPrice} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-1/3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total HT</span>
                <span className="font-medium text-gray-900">{quote.totalHT} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium text-gray-900">{quote.taxAmount} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span className="text-gray-900">Total TTC</span>
                <span className="text-gray-900">{quote.totalTTC} €</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
