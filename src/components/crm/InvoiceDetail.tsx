'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice, Client, Product, Organization } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import { organizationRepository } from '@/lib/data';
import { PDFDownloadLink } from '@react-pdf/renderer';
import DocumentPDF from './DocumentPDF';
import StripePaymentButton from './StripePaymentButton';
import { generateInvoicePDF, generateQuotePDF, downloadPDF } from '@/lib/utils/pdf-generator';

interface InvoiceDetailProps {
  invoice: Invoice;
  client: Client | undefined;
  products: Product[];
  onMarkAsPaid: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function InvoiceDetail({ invoice, client, products, onMarkAsPaid, onDelete }: InvoiceDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    async function loadOrg() {
      if (user?.organizationId) {
        const org = await organizationRepository.getById(user.organizationId);
        setOrganization(org || null);
      }
    }
    loadOrg();
  }, [user]);

  const handleSendEmail = () => {
    alert('Document envoyé par email avec succès ! (Simulation)');
  };

  const handleDuplicate = () => {
    alert('Fonctionnalité de duplication à venir.');
  };

  const handleConvertToInvoice = () => {
    alert('Devis converti en facture avec succès ! (Simulation)');
  };

  const getProductName = (productId?: string) => {
    if (!productId) return '';
    return products.find(p => p.id === productId)?.name || 'Produit inconnu';
  };

  const isQuote = invoice.type === 'quote';

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 p-6 space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isQuote ? 'Devis' : 'Facture'} {invoice.number}
          </h2>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Date d&apos;émission : {new Date(invoice.date).toLocaleDateString('fr-FR')}
            </span>
            {invoice.dueDate && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">
                  Échéance : {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {organization && client && (
            <button
              onClick={async () => {
                try {
                  const blob = isQuote 
                    ? await generateQuotePDF(invoice as any, organization, client as any)
                    : await generateInvoicePDF(invoice, organization, client as any);
                  downloadPDF(blob, `${isQuote ? 'Devis' : 'Facture'}_${invoice.number}.pdf`);
                } catch (err) {
                  console.error(err);
                  alert('Erreur lors de la génération du PDF');
                }
              }}
              className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Télécharger PDF
            </button>
          )}

          <button
            onClick={handleSendEmail}
            className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Envoyer par email
          </button>

          <button
            onClick={handleDuplicate}
            className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Dupliquer
          </button>

          {isQuote && (
            <button
              onClick={handleConvertToInvoice}
              className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Convertir en facture
            </button>
          )}

          {invoice.status === 'sent' && !isQuote && (
            <button
              onClick={async () => {
                await onMarkAsPaid();
                alert('Facture marquée comme payée');
              }}
              className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Marquer comme payée
            </button>
          )}

          {(!isQuote && invoice.status !== 'paid' && invoice.status !== 'draft' && organization) && (
            <StripePaymentButton invoiceId={invoice.id} organizationId={organization.id} />
          )}

          {invoice.status === 'draft' && (
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Modifier
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Émetteur</h3>
          <p className="font-semibold text-gray-900">MonService</p>
          <p className="text-sm text-gray-600">123 Rue de la République</p>
          <p className="text-sm text-gray-600">75001 Paris, France</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Adressé à</h3>
          <p className="font-semibold text-gray-900">{client?.name || 'Client Inconnu'}</p>
          {client?.address && <p className="text-sm text-gray-600">{client.address}</p>}
          {client?.country && <p className="text-sm text-gray-600">{client.country}</p>}
          {client?.email && <p className="text-sm text-gray-600 mt-1">{client.email}</p>}
        </div>
      </div>

      {/* Table */}
      <div className="border-t border-gray-200 pt-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix Unitaire HT</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">TVA</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remise</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total HT</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoice.lines.map((line) => {
              const discount = line.discount || 0;
              const lineTotalHT = line.quantity * line.unitPrice * (1 - discount / 100);
              return (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {line.productId ? getProductName(line.productId) : line.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{line.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{line.taxRate}%</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{discount > 0 ? `${discount}%` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(lineTotalHT)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end pt-4">
        <div className="w-full max-w-sm space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Total HT</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.totalHT)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>TVA</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2">
            <span>Total TTC</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.totalTTC)}</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
        <button
          onClick={async () => {
            if (window.confirm('Voulez-vous vraiment supprimer ce document ?')) {
              await onDelete();
              alert('Document supprimé');
              router.push('/invoices');
            }
          }}
          className="text-red-600 hover:text-red-900 text-sm font-medium"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
