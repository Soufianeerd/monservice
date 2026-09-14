'use server';

import Link from 'next/link';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientBillingService } from '@/lib/services/patient-billing.service';
import { CreditCard, ChevronLeft, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import InvoicePaymentButton from '@/components/client/InvoicePaymentButton';

export default async function PatientPortalInvoicesPage() {
  const portalCtx = await requirePatientPortalAccess();
  const invoices = await patientBillingService.getMyPatientInvoices(
    portalCtx.userId,
    portalCtx.patientId,
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Réglée
          </span>
        );
      case 'sent':
      case 'viewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" /> En attente de règlement
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5" /> Échue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back button & Header */}
      <div>
        <Link
          href="/client/sante"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Retour au suivi santé
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Mes Factures de Soins</h1>
        <p className="text-sm text-slate-500">
          Consultez vos notes d’honoraires, attestations de paiement pour mutuelle et réglez vos soins en ligne par carte bancaire.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Aucune facture émise</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Vos factures et notes d'honoraires émises par votre praticien apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-teal-400 transition-colors space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900">
                      Facture {inv.invoiceNumber}
                    </h3>
                    {getStatusBadge(inv.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Date d’émission :{' '}
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(inv.issueDate))}
                    {inv.dueDate && ` • Échéance : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(inv.dueDate))}`}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500">Montant total TTC</p>
                  <p className="text-xl font-extrabold text-slate-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: inv.currency || 'EUR' }).format(
                      inv.totalTTC,
                    )}
                  </p>
                </div>
              </div>

              {/* Invoice Lines Table */}
              <div className="border-t border-slate-100 pt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="pb-2 font-medium">Prestation</th>
                      <th className="pb-2 font-medium text-right">Qté</th>
                      <th className="pb-2 font-medium text-right">Prix unitaire</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inv.lines.map((line, idx) => (
                      <tr key={line.id || idx} className="text-slate-700">
                        <td className="py-2">{line.description}</td>
                        <td className="py-2 text-right">{line.quantity}</td>
                        <td className="py-2 text-right">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                            line.unitPrice,
                          )}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                            line.totalTTC,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                <Link
                  href={`/client/invoices/${inv.id}`}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Détails & Télécharger PDF
                </Link>
                {inv.status !== 'paid' && (
                  <InvoicePaymentButton invoiceId={inv.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
