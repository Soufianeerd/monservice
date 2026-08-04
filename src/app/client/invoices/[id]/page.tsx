'use client';
import { getByIdAction, updateAction } from '@/app/actions/organization.actions';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Invoice } from '@/lib/data/interfaces';
import * as invoiceActions from '@/app/actions/invoice.actions';
import { useEffect, useState, use } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateInvoicePDF, downloadPDF } from '@/lib/utils/pdf-generator';
import { DownloadIcon } from 'lucide-react';
import InvoicePaymentButton from '@/components/client/InvoicePaymentButton';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const inv = await invoiceActions.getByIdAction(id);
        
        if (inv && inv.clientId === user.id && inv.type === 'invoice') {
          setInvoice(inv);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la facture:', error);
      }
    }
    loadData();
  }, [id, user]);

  const handleDownload = async () => {
    if (invoice && user?.organizationId) {
      try {
        const org = await getByIdAction(user.organizationId) || await getByIdAction(invoice.organizationId);
        if (!org) return;
        const client = { name: user.name || 'Client', email: user.email };
        const blob = await generateInvoicePDF(invoice, org, client);
        downloadPDF(blob, `Facture_${invoice.number}.pdf`);
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        alert('Erreur lors de la génération du PDF');
      }
    }
  };

  if (!invoice) return <div>Chargement...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facture {invoice.number}</h1>
          <p className="text-gray-500">Émise le {format(new Date(invoice.createdAt), 'PP', { locale: fr })}</p>
        </div>
        <div className="flex space-x-3">
          {invoice.status !== 'paid' && (
            <InvoicePaymentButton invoiceId={invoice.id} />
          )}
          <button 
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Télécharger PDF
          </button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Détails du paiement</h3>
              <p className="text-sm text-gray-900">Statut : <span className="font-semibold">{invoice.status === 'paid' ? 'Payée' : 'En attente'}</span></p>
              <p className="text-sm text-gray-900">Échéance : {invoice.dueDate ? format(new Date(invoice.dueDate), 'PP', { locale: fr }) : '-'}</p>
            </div>
          </div>

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
                {invoice.lines.map((line, idx) => (
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
                <span className="font-medium text-gray-900">{invoice.totalHT} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium text-gray-900">{invoice.taxAmount} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span className="text-gray-900">Total TTC</span>
                <span className="text-gray-900">{invoice.totalTTC} €</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
