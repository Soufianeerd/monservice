'use client';

import { useState, useTransition } from 'react';
import { recordPaymentAction, requestReviewAction } from '@/app/actions/growth.actions';
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, isOpenInvoiceStatus, type ManualPaymentMethod } from '@/lib/growth/payment';
import type { Invoice } from '@/lib/data/interfaces';

type Feedback = { type: 'ok' | 'error'; text: string } | null;

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Règlement d'une facture et demande d'avis une fois réglée. */
export default function InvoicePaymentPanel({ invoice, reviewsAvailable }: { invoice: Invoice; reviewsAvailable: boolean }) {
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<ManualPaymentMethod>('transfer');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  if (invoice.status === 'paid') {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm" data-testid="invoice-paid">
        <p className="font-medium text-green-800">
          Réglée{invoice.paidAt ? ` le ${new Date(invoice.paidAt).toLocaleDateString('fr-FR')}` : ''}
          {invoice.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[invoice.paymentMethod]}` : ''}
        </p>
        {reviewsAvailable && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => {
                setFeedback(null);
                const result = await requestReviewAction({ invoiceId: invoice.id });
                if (!result.ok) setFeedback({ type: 'error', text: result.error });
                else setFeedback({
                  type: 'ok',
                  text: result.data.emailSent ? `Demande d’avis envoyée à ${result.data.email}.` : `Demande créée, mais l’e-mail n’a pas pu partir. Lien à transmettre : ${result.data.url}`,
                });
              })}
              className="rounded-md border border-indigo-600 bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              Demander un avis au client
            </button>
          </div>
        )}
        {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 break-all ${feedback.type === 'ok' ? 'text-green-800' : 'text-red-700'}`}>{feedback.text}</p>}
      </div>
    );
  }

  if (!isOpenInvoiceStatus(invoice.status)) return null;
  const due = invoice.amountDue && invoice.amountDue > 0 ? invoice.amountDue : invoice.totalTTC;

  return (
    <form
      className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm"
      data-testid="record-payment"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(null);
        startTransition(async () => {
          const result = await recordPaymentAction({ invoiceId: invoice.id, paidOn, method });
          if (result.ok) {
            setFeedback({ type: 'ok', text: 'Règlement enregistré.' });
            // La fiche facture est chargée côté client : rechargement complet.
            window.location.reload();
          } else {
            setFeedback({ type: 'error', text: result.error });
          }
        });
      }}
    >
      <p className="font-medium text-gray-900">Enregistrer le règlement de {euro.format(due)}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label>
          <span className="block text-gray-600">Reçu le</span>
          <input type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setPaidOn(event.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-1.5" required />
        </label>
        <label>
          <span className="block text-gray-600">Mode</span>
          <select value={method} onChange={(event) => setMethod(event.target.value as ManualPaymentMethod)} className="mt-1 rounded-md border border-gray-300 px-3 py-1.5">
            {MANUAL_PAYMENT_METHODS.map((value) => <option key={value} value={value}>{PAYMENT_METHOD_LABELS[value]}</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50">
          {pending ? 'Enregistrement…' : 'Marquer comme réglée'}
        </button>
      </div>
      {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 ${feedback.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{feedback.text}</p>}
    </form>
  );
}
