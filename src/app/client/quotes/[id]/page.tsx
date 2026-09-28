'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState, use } from 'react';
import { generateQuotePDF, downloadPDF } from '@/lib/utils/pdf-generator';
import { DownloadIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getClientQuoteAction, markQuoteViewedAction, rejectQuoteAction } from '@/app/actions/quote.actions';
import { getByIdAction } from '@/app/actions/organization.actions';
import type { ClientQuoteDTO } from '@/lib/data/dto/client-billing.dto';
import type { Invoice } from '@/lib/data/interfaces';

export default function ClientQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();

  const [quote, setQuote] = useState<ClientQuoteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const q = await getClientQuoteAction(id);
        if (q) {
          setQuote(q);
          if (q.status === 'sent') {
            await markQuoteViewedAction({ quoteId: q.id });
            setQuote((prev) => (prev ? { ...prev, status: 'viewed' } : null));
          }
        }
      } catch (err) {
        console.error('Erreur chargement devis:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [id, user]);

  const handleAccept = () => {
    if (!quote) return;
    router.push(`/devis/${quote.id}/sign`);
  };

  const handleDecline = async () => {
    if (!quote) return;
    const reason = prompt('Veuillez indiquer la raison du refus (facultatif) :');
    if (reason === null) return; // user cancelled prompt

    setActionLoading(true);
    try {
      await rejectQuoteAction({ quoteId: quote.id, reason: reason || undefined });
      setQuote({ ...quote, status: 'rejected' });
    } catch (err) {
      console.error('Erreur refus devis:', err);
      alert('Impossible de refuser ce devis.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!quote) return;
    try {
      const org = await getByIdAction(quote.organizationId);
      if (!org) {
        alert('Informations de la société introuvables.');
        return;
      }
      const clientInfo = {
        name: user?.name || 'Client',
        email: user?.email,
      };

      const blob = await generateQuotePDF(quote, org, clientInfo);
      downloadPDF(blob, `Devis_${quote.number}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement du devis...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500">Devis introuvable ou non autorisé.</div>;

  const isPending = quote.status === 'sent' || quote.status === 'viewed';
  const isAccepted = quote.status === 'accepted';
  const isRejected = quote.status === 'rejected';

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Status banner */}
      {isAccepted && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-3 text-green-800">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">Devis accepté et signé</p>
            <p className="text-xs text-green-700">
              Signé le {quote.acceptedAt ? format(new Date(quote.acceptedAt), 'PPp', { locale: fr }) : ''}
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-3 text-red-800">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">Devis refusé</p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center space-x-3 text-blue-800">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">Devis en attente de votre réponse</p>
            {quote.validUntil && (
              <p className="text-xs text-blue-700">
                Offre valable jusqu'au {format(new Date(quote.validUntil), 'PP', { locale: fr })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis {quote.number}</h1>
          {quote.title && <p className="text-base text-gray-700 font-medium">{quote.title}</p>}
          <p className="text-sm text-gray-500">
            Émis le {format(new Date(quote.createdAt), 'PP', { locale: fr })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Télécharger PDF
          </button>

          {isPending && (
            <>
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                data-testid="client-refuse-quote-button"
                className="bg-white px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Refuser
              </button>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                data-testid="client-accept-quote-button"
                className="bg-indigo-600 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Signer &amp; Accepter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quote details */}
      <Card>
        <CardBody className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Désignation
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qté
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P.U. HT
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remise
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TVA
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total HT
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quote.sections && quote.sections.length > 0 ? (
                  quote.sections
                    .filter((s) => s.isSelected)
                    .map((sec) => {
                      const secLines = quote.lines.filter((l) => l.sectionId === sec.id);
                      return (
                        <tr key={sec.id} className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-2 font-semibold text-sm text-indigo-900">
                            {sec.kind.toUpperCase()} : {sec.title}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  quote.lines.map((line, idx) => {
                    const gross = line.quantity * line.unitPrice;
                    const discount = line.discountRate || 0;
                    const net = gross * (1 - discount / 100);
                    return (
                      <tr key={line.id || idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{line.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {line.quantity} {line.unitCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {line.unitPrice.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {discount > 0 ? `${discount}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{line.taxRate}%</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                          {net.toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Deposit summary */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-6">
            <div className="sm:max-w-xs text-sm text-gray-500 space-y-1">
              {quote.depositMode && quote.depositMode !== 'none' && (quote.depositAmount || 0) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="font-semibold text-amber-900">Acompte à la commande</p>
                  <p className="text-amber-800 text-xs mt-1">
                    Un acompte de{' '}
                    <strong className="text-amber-900">{quote.depositAmount?.toFixed(2)} € TTC</strong>
                    {quote.depositMode === 'percentage' ? ` (${quote.depositRate}%)` : ''} sera demandé pour valider le démarrage des travaux.
                  </p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total brut HT</span>
                <span className="font-medium text-gray-900">{quote.grossHT.toFixed(2)} €</span>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Remises</span>
                  <span className="font-medium">-{quote.discountAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total net HT</span>
                <span className="font-medium text-gray-900">{quote.totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total TVA</span>
                <span className="font-medium text-gray-900">{quote.taxAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 text-gray-900">
                <span>Total TTC</span>
                <span className="text-indigo-600">{quote.totalTTC.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
