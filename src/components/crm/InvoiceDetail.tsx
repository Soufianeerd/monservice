'use client';
import { askConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { getByIdAction } from '@/app/actions/organization.actions';
import { updateAction as updateInvoiceAction } from '@/app/actions/invoice.actions';
import { sendDocumentByEmailAction } from '@/app/actions/email.actions';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice, Client, Product, Organization } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import InvoicePaymentPanel from '@/components/growth/InvoicePaymentPanel';
import { isGrowthAvailable } from '@/lib/growth/availability';

interface InvoiceDetailProps {
  invoice: Invoice;
  client: Client | undefined;
  products: Product[];
  onDelete: () => Promise<void>;
}

export default function InvoiceDetail({ invoice, client, products, onDelete }: InvoiceDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  // Envoi réel (S-04) : la facture part en PDF joint ; un brouillon est émis d'abord.
  const emailInvoice = async () => {
    setIssuing(true);
    setIssueError(null);
    setEmailNotice(null);
    try {
      const result = await sendDocumentByEmailAction(invoice.id);
      if (result.sent) {
        setEmailNotice(result.message);
        router.refresh();
      } else {
        setIssueError(result.message);
      }
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setIssuing(false);
    }
  };

  // Émission (S-03) : verrouille la facture, attribue son numéro définitif et
  // sa date. Elle peut ensuite être réglée, relancée et suivie en trésorerie.
  const issueInvoice = async () => {
    if (!await askConfirm('Elle recevra son numéro définitif et ne pourra plus être modifiée.', { title: 'Émettre la facture ?', confirmLabel: 'Émettre', tone: 'default' })) return;
    setIssuing(true);
    setIssueError(null);
    try {
      await updateInvoiceAction(invoice.id, null, { status: 'sent' });
      router.refresh();
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : 'Émission impossible.');
    } finally {
      setIssuing(false);
    }
  };

  useEffect(() => {
    async function loadOrg() {
      if (user?.organizationId) {
        const org = await getByIdAction(user.organizationId);
        setOrganization(org || null);
      }
    }
    loadOrg();
  }, [user]);

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
            {isQuote ? 'Devis' : 'Facture'} {invoice.number?.startsWith('BROUILLON-') ? '(brouillon, numéro attribué à l’émission)' : invoice.number}
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
                  // Le PDF attend des champs absents plutôt que null.
                  const pdfClient = {
                    name: client.name,
                    email: client.email ?? undefined,
                    phone: client.phone ?? undefined,
                    address: client.address ?? undefined,
                    city: client.city ?? undefined,
                    zipCode: client.zipCode ?? undefined,
                    country: client.country ?? undefined,
                  };
                  // Générateur PDF (~480 Ko) chargé seulement au clic.
                  const { generateInvoicePDF, generateQuotePDF, downloadPDF } = await import('@/lib/utils/pdf-generator');
                  const blob = isQuote
                    ? await generateQuotePDF(invoice, organization, pdfClient)
                    : await generateInvoicePDF(invoice, organization, pdfClient);
                  downloadPDF(blob, `${isQuote ? 'Devis' : 'Facture'}_${invoice.number}.pdf`);
                } catch (err) {
                  console.error(err);
                  toast.error('Erreur lors de la génération du PDF');
                }
              }}
              className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Télécharger PDF
            </button>
          )}

          {invoice.type !== 'quote' && invoice.status !== 'cancelled' && (
            <button
              type="button"
              onClick={emailInvoice}
              disabled={issuing}
              data-testid="email-invoice-button"
              className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Envoyer par e-mail
            </button>
          )}

          {invoice.status === 'draft' && invoice.type !== 'quote' && (
            <button
              type="button"
              onClick={issueInvoice}
              disabled={issuing}
              data-testid="issue-invoice-button"
              className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {issuing ? 'Émission…' : 'Émettre la facture'}
            </button>
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

      {issueError && <p role="alert" className="text-sm text-red-600">{issueError}</p>}
      {emailNotice && <p className="text-sm text-emerald-700">{emailNotice}</p>}

      <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Émetteur</h3>
          <p className="font-semibold text-gray-900">{organization?.name ?? '…'}</p>
          {organization?.address && <p className="text-sm text-gray-600">{organization.address}</p>}
          {(organization?.postalCode || organization?.city) && (
            <p className="text-sm text-gray-600">{[organization?.postalCode, organization?.city].filter(Boolean).join(' ')}</p>
          )}
          {organization?.email && <p className="text-sm text-gray-600 mt-1">{organization.email}</p>}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Adressé à</h3>
          <p className="font-semibold text-gray-900">{client?.name || 'Client Inconnu'}</p>
          {client?.address && <p className="text-sm text-gray-600">{client.address}</p>}
          {client?.country && <p className="text-sm text-gray-600">{client.country}</p>}
          {client?.email && <p className="text-sm text-gray-600 mt-1">{client.email}</p>}
        </div>
      </div>

      {!isQuote && organization && (
        <InvoicePaymentPanel invoice={invoice} reviewsAvailable={isGrowthAvailable(organization.sector)} />
      )}

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

      {invoice.status === 'draft' && <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
        <button
          onClick={async () => {
            if (await askConfirm('Voulez-vous vraiment supprimer ce document ?')) {
              await onDelete();
              toast.success('Document supprimé');
              router.push('/invoices');
            }
          }}
          className="text-red-600 hover:text-red-900 text-sm font-medium"
        >
          Supprimer
        </button>
      </div>}
    </div>
  );
}
