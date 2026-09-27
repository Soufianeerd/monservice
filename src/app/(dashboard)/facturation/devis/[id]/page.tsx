'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  ArrowLeft,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Copy,
  Receipt,
  Wrench,
  Edit,
} from 'lucide-react';
import {
  getQuoteAction,
  sendQuoteAction,
  deleteDraftQuoteAction,
  createQuoteRevisionAction,
  createDepositInvoiceAction,
  convertQuoteToInvoiceAction,
  createWorkOrderFromQuoteAction,
} from '@/app/actions/quote.actions';
import { generateQuotePDF, downloadPDF } from '@/lib/utils/pdf-generator';
import { getByIdAction } from '@/app/actions/organization.actions';
import type { Invoice } from '@/lib/data/interfaces';

export default function ProfessionalQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [quote, setQuote] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const q = await getQuoteAction(id);
        if (q) {
          setQuote(q);
        } else {
          setError('Devis introuvable ou vous n’avez pas les droits.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur chargement devis';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchQuote();
    }
  }, [id, user]);

  const handleSend = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await sendQuoteAction({ quoteId: quote.id });
      setQuote(updated);
      setSuccessMsg('Devis envoyé au client avec succès !');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce brouillon de devis ?')) return;
    setActionLoading(true);
    try {
      await deleteDraftQuoteAction(quote.id);
      router.push('/facturation/devis');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setActionLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      const revision = await createQuoteRevisionAction({ quoteId: quote.id });
      setSuccessMsg(`Nouvelle révision N° ${revision.revisionNumber} créée !`);
      router.push(`/facturation/devis/${revision.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la révision');
      setActionLoading(false);
    }
  };

  const handleCreateDeposit = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      const depositInvoice = await createDepositInvoiceAction({ quoteId: quote.id });
      setSuccessMsg(`Facture d'acompte N° ${depositInvoice.number} générée avec succès !`);
      router.push(`/facturation/factures/${depositInvoice.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur génération facture d'acompte");
      setActionLoading(false);
    }
  };

  const handleConvertToFinalInvoice = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      const finalInvoice = await convertQuoteToInvoiceAction({ quoteId: quote.id });
      setSuccessMsg(`Facture finale N° ${finalInvoice.number} créée avec déduction d'acompte !`);
      router.push(`/facturation/factures/${finalInvoice.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur conversion en facture finale');
      setActionLoading(false);
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!quote) return;
    setActionLoading(true);
    setError(null);
    try {
      const wo = await createWorkOrderFromQuoteAction({
        quoteId: quote.id,
      });
      setSuccessMsg(`Intervention / Chantier créé : ${wo.title} !`);
      router.push(`/field-service/interventions/${wo.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur création ordre de travail");
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quote || !user?.organizationId) return;
    try {
      const org = await getByIdAction(quote.organizationId);
      if (!org) {
        alert('Organisation introuvable');
        return;
      }
      const clientInfo = {
        name: quote.client?.name || 'Client',
        email: quote.client?.email,
        phone: quote.client?.phone,
        address: quote.client?.address,
        city: quote.client?.city,
        zipCode: quote.client?.zipCode,
      };
      const siteInfo = quote.site
        ? {
            name: quote.site.name,
            address: quote.site.address,
            city: quote.site.city,
            zipCode: quote.site.zipCode,
          }
        : undefined;

      const blob = await generateQuotePDF(quote, org, clientInfo, siteInfo);
      downloadPDF(blob, `Devis_${quote.number}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du PDF');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500">{error || 'Devis introuvable'}</div>;

  const isDraft = quote.status === 'draft';
  const isAccepted = quote.status === 'accepted';
  const isSent = quote.status === 'sent';
  const isViewed = quote.status === 'viewed';
  const isRejected = quote.status === 'rejected';

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <Link
            href="/facturation/devis"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour à la liste des devis
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Devis N° {quote.number}</h1>
            {quote.revisionNumber && quote.revisionNumber > 1 && (
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-medium">
                Rév. {quote.revisionNumber}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isAccepted
                  ? 'bg-green-100 text-green-800'
                  : isDraft
                  ? 'bg-gray-100 text-gray-800'
                  : isSent || isViewed
                  ? 'bg-blue-100 text-blue-800'
                  : isRejected
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {isAccepted
                ? 'Accepté & Signé'
                : isDraft
                ? 'Brouillon'
                : isSent
                ? 'Envoyé au client'
                : isViewed
                ? 'Consulté par le client'
                : isRejected
                ? 'Refusé'
                : quote.status}
            </span>
          </div>
          {quote.title && <p className="text-gray-700 font-medium mt-1">{quote.title}</p>}
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <Download className="w-4 h-4 mr-1.5" />
            PDF
          </button>

          {isDraft && (
            <>
              <button
                onClick={handleSend}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Envoyer au client
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Supprimer
              </button>
            </>
          )}

          {(isSent || isViewed) && (
            <button
              onClick={handleRevise}
              disabled={actionLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Créer une révision
            </button>
          )}

          {isAccepted && (
            <>
              {quote.depositMode !== 'none' && (quote.depositAmount || 0) > 0 && (
                <button
                  onClick={handleCreateDeposit}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4 mr-1.5" />
                  Facture d'acompte
                </button>
              )}

              <button
                onClick={handleCreateWorkOrder}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
              >
                <Wrench className="w-4 h-4 mr-1.5" />
                Créer chantier / intervention
              </button>

              <button
                onClick={handleConvertToFinalInvoice}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Facturer le solde
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          {successMsg}
        </div>
      )}

      {/* Acceptance & Signature Banner */}
      {isAccepted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-2 text-green-900 font-semibold text-base">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Devis formellement accepté et signé électroniquement</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Accepté le{' '}
                {quote.acceptedAt ? format(new Date(quote.acceptedAt), 'PPpp', { locale: fr }) : ''}
              </p>
            </div>
            {quote.signature && (
              <div className="bg-white p-2 border border-green-200 rounded-md text-center">
                <p className="text-[10px] text-gray-500 mb-1 font-medium">Signature client</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={quote.signature}
                  alt="Signature client"
                  className="h-12 max-w-[160px] object-contain border border-gray-100"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Client &amp; Contact
            </h3>
            <p className="font-semibold text-gray-900">{quote.client?.name || 'Client'}</p>
            {quote.client?.email && <p className="text-sm text-gray-600">{quote.client.email}</p>}
            {quote.client?.phone && <p className="text-sm text-gray-600">{quote.client.phone}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Site / Chantier
            </h3>
            {quote.site ? (
              <div>
                <p className="font-semibold text-gray-900">{quote.site.name}</p>
                <p className="text-sm text-gray-600">{quote.site.address}</p>
                <p className="text-sm text-gray-600">
                  {quote.site.zipCode} {quote.site.city}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Non spécifié</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Modalités
            </h3>
            <p className="text-sm text-gray-600">
              Validité :{' '}
              {quote.validUntil ? format(new Date(quote.validUntil), 'PP', { locale: fr }) : '30 jours'}
            </p>
            <p className="text-sm text-gray-600">
              Acompte :{' '}
              {quote.depositMode === 'percentage'
                ? `${quote.depositRate}% (${quote.depositAmount?.toFixed(2)} € TTC)`
                : quote.depositMode === 'fixed'
                ? `${quote.depositAmount?.toFixed(2)} € TTC (Fixe)`
                : 'Aucun'}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Detailed Quote Breakdown */}
      <Card>
        <CardBody className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Chiffrage et Lignes</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-xs">
                <tr>
                  <th className="px-3 py-3 text-left">Désignation</th>
                  <th className="px-3 py-3 text-right">Qté</th>
                  <th className="px-3 py-3 text-left">Unité</th>
                  <th className="px-3 py-3 text-right">P.U. HT</th>
                  <th className="px-3 py-3 text-right">Remise</th>
                  <th className="px-3 py-3 text-right">TVA</th>
                  <th className="px-3 py-3 text-right">Total HT</th>
                  <th className="px-3 py-3 text-right bg-blue-50/50 text-blue-900">Coût Interne</th>
                  <th className="px-3 py-3 text-right bg-blue-50/50 text-blue-900">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quote.sections && quote.sections.length > 0 ? (
                  quote.sections.map((sec) => {
                    const secLines = (quote.lines || []).filter((l) => l.sectionId === sec.id);
                    return (
                      <tbody key={sec.id} className="divide-y divide-gray-100">
                        <tr className="bg-indigo-50/60 font-semibold text-indigo-900">
                          <td colSpan={9} className="px-3 py-2 text-xs uppercase tracking-wide">
                            {sec.kind} : {sec.title}
                          </td>
                        </tr>
                        {secLines.map((line, idx) => {
                          const gross = line.quantity * line.unitPrice;
                          const discount = line.discountRate || 0;
                          const net = gross * (1 - discount / 100);
                          const cost = typeof line.unitCost === 'number' ? line.quantity * line.unitCost : null;
                          const margin = cost !== null ? net - cost : null;
                          return (
                            <tr key={line.id || idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900 font-medium">
                                {line.description}
                              </td>
                              <td className="px-3 py-2 text-right">{line.quantity}</td>
                              <td className="px-3 py-2 text-left text-gray-500">{line.unitCode}</td>
                              <td className="px-3 py-2 text-right">{line.unitPrice.toFixed(2)} €</td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {discount > 0 ? `${discount}%` : '-'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">{line.taxRate}%</td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                {net.toFixed(2)} €
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500 bg-blue-50/30">
                                {cost !== null ? `${cost.toFixed(2)} €` : '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-700 bg-blue-50/30">
                                {margin !== null ? `${margin.toFixed(2)} €` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })
                ) : (
                  (quote.lines || []).map((line, idx) => {
                    const gross = line.quantity * line.unitPrice;
                    const discount = line.discountRate || 0;
                    const net = gross * (1 - discount / 100);
                    const cost = typeof line.unitCost === 'number' ? line.quantity * line.unitCost : null;
                    const margin = cost !== null ? net - cost : null;
                    return (
                      <tr key={line.id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-medium">{line.description}</td>
                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                        <td className="px-3 py-2 text-left text-gray-500">{line.unitCode}</td>
                        <td className="px-3 py-2 text-right">{line.unitPrice.toFixed(2)} €</td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {discount > 0 ? `${discount}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{line.taxRate}%</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          {net.toFixed(2)} €
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 bg-blue-50/30">
                          {cost !== null ? `${cost.toFixed(2)} €` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-700 bg-blue-50/30">
                          {margin !== null ? `${margin.toFixed(2)} €` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end">
            <div className="w-full sm:w-80 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total net HT :</span>
                <span className="font-semibold text-gray-900">{quote.totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total TVA :</span>
                <span className="font-semibold text-gray-900">{quote.taxAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total TTC :</span>
                <span className="text-blue-600">{quote.totalTTC.toFixed(2)} €</span>
              </div>
              {quote.depositMode !== 'none' && (quote.depositAmount || 0) > 0 && (
                <div className="flex justify-between text-sm font-semibold text-amber-700 bg-amber-50 p-2 rounded">
                  <span>Acompte convenu :</span>
                  <span>{quote.depositAmount?.toFixed(2)} € TTC</span>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
