'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acknowledgeWorkReportAction } from '@/app/actions/field-service-client-portal.actions';

const inputClass = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white';

/** Réception des travaux : signature nominative, avec ou sans réserves. */
export default function AcknowledgeReportForm({ workReportId }: { workReportId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [withReservations, setWithReservations] = useState(false);
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeWorkReportAction({
        workReportId,
        signerName,
        decision: withReservations ? 'accepted_with_reservations' : 'accepted',
        comment: comment || null,
      });
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="border-t border-gray-100 pt-3 space-y-3" data-testid="client-ack-form">
      <p className="text-sm font-medium text-gray-900">Réception des travaux</p>
      {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
      <label className="block space-y-1.5">
        <span className="text-sm text-gray-700">Votre nom (signature)</span>
        <input required minLength={2} maxLength={120} value={signerName} onChange={(e) => setSignerName(e.target.value)} className={inputClass} data-testid="client-ack-signer" />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={withReservations} onChange={(e) => setWithReservations(e.target.checked)} data-testid="client-ack-reservations" />
        J’émets des réserves
      </label>
      {withReservations && (
        <label className="block space-y-1.5">
          <span className="text-sm text-gray-700">Vos réserves</span>
          <textarea required minLength={3} maxLength={2000} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} data-testid="client-ack-comment" />
        </label>
      )}
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" data-testid="client-ack-confirm" />
        Je confirme avoir pris connaissance du compte rendu. Cette réception sera horodatée et ne pourra plus être modifiée.
      </label>
      <button type="submit" disabled={isPending || !confirmed || signerName.trim().length < 2} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl" data-testid="client-ack-submit">
        {isPending ? 'Enregistrement…' : 'Signer la réception'}
      </button>
    </form>
  );
}
