'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { replyToReviewAction, reportReviewAction, requestReviewAction, revokeReviewRequestAction } from '@/app/actions/growth.actions';
import { REVIEW_REPORT_LABELS, REVIEW_REPORT_REASONS, type ReviewReportReason } from '@/lib/growth/review';
import type { OwnReview, ReviewOverview } from '@/lib/services/review.service';

type Feedback = { type: 'ok' | 'error'; text: string } | null;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-yellow-400" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= Math.round(value) ? 'fill-current' : 'text-gray-300'}`} aria-hidden="true" />)}
    </span>
  );
}

function ReviewCard({ review, isAdmin }: { review: OwnReview; isAdmin: boolean }) {
  const [reply, setReply] = useState(review.reply ?? '');
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState<ReviewReportReason>('abusive');
  const [reporting, setReporting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="py-5" data-testid="own-review">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        <span className="text-sm font-medium text-gray-900">{review.author}</span>
        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString('fr-FR')}{review.invoiceNumber ? ` · facture ${review.invoiceNumber}` : ''}</span>
        {review.reportedAt && <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800">Signalé à MonService</span>}
        {review.hidden && <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">Retiré par la modération</span>}
      </div>
      {review.comment && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{review.comment}</p>}

      {review.reply && !editing && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <p className="text-xs font-semibold text-gray-500">Votre réponse publique</p>
          <p className="mt-1 whitespace-pre-line">{review.reply}</p>
        </div>
      )}

      {isAdmin && editing && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await replyToReviewAction({ reviewId: review.id, reply });
              setFeedback(result.ok ? { type: 'ok', text: reply.trim() ? 'Réponse publiée.' : 'Réponse retirée.' } : { type: 'error', text: result.error });
              if (result.ok) setEditing(false);
            });
          }}
        >
          <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} rows={3} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Remerciez votre client, ou apportez votre version des faits avec courtoisie." />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Publier la réponse</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Annuler</button>
          </div>
        </form>
      )}

      {isAdmin && reporting && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await reportReviewAction({ reviewId: review.id, reason });
              setFeedback(result.ok ? { type: 'ok', text: 'Avis signalé. MonService l’examinera ; il reste visible en attendant.' } : { type: 'error', text: result.error });
              if (result.ok) setReporting(false);
            });
          }}
        >
          <select value={reason} onChange={(event) => setReason(event.target.value as ReviewReportReason)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            {REVIEW_REPORT_REASONS.map((value) => <option key={value} value={value}>{REVIEW_REPORT_LABELS[value]}</option>)}
          </select>
          <button type="submit" disabled={pending} className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Signaler</button>
          <button type="button" onClick={() => setReporting(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Annuler</button>
        </form>
      )}

      {isAdmin && !editing && !reporting && (
        <div className="mt-2 flex gap-4 text-sm">
          <button type="button" onClick={() => setEditing(true)} className="font-medium text-indigo-600 hover:text-indigo-700">{review.reply ? 'Modifier la réponse' : 'Répondre'}</button>
          {!review.reportedAt && <button type="button" onClick={() => setReporting(true)} className="text-gray-500 hover:text-gray-700">Signaler un abus</button>}
        </div>
      )}
      {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-sm ${feedback.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{feedback.text}</p>}
    </li>
  );
}

export default function ReviewsManager({ overview, isAdmin, publicSlug, autoRequests }: {
  overview: ReviewOverview;
  isAdmin: boolean;
  publicSlug: string | null;
  autoRequests: boolean;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const request = (invoiceId: string) => startTransition(async () => {
    setFeedback(null);
    const result = await requestReviewAction({ invoiceId });
    if (!result.ok) setFeedback({ type: 'error', text: result.error });
    else setFeedback({
      type: 'ok',
      text: result.data.emailSent
        ? `Demande envoyée à ${result.data.email}.`
        : `Demande créée, mais l’e-mail n’a pas pu partir. Transmettez ce lien à votre client : ${result.data.url}`,
    });
  });

  return (
    <div className="space-y-6" data-testid="reviews-manager">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Avis clients</h1>
          <p className="mt-1 text-sm text-gray-500">Des avis vérifiés : seul un client ayant réglé une facture peut en laisser un, par un lien personnel à usage unique.</p>
        </div>
        <div className="text-right">
          {overview.summary.count > 0 && overview.summary.average !== null ? (
            <p className="flex items-center justify-end gap-2 text-lg"><Stars value={overview.summary.average} /><strong>{overview.summary.average.toLocaleString('fr-FR')}</strong>/5</p>
          ) : null}
          <p className="text-sm text-gray-500">{overview.summary.count} avis publié{overview.summary.count > 1 ? 's' : ''}</p>
          {publicSlug
            ? <Link href={`/pro/${publicSlug}#avis`} target="_blank" className="text-sm font-medium text-indigo-600">Voir sur ma vitrine</Link>
            : <Link href="/parametres/vitrine" className="text-sm font-medium text-indigo-600">Publier ma vitrine pour les afficher</Link>}
        </div>
      </div>

      {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`rounded-md p-3 text-sm break-all ${feedback.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{feedback.text}</p>}

      <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-gray-900">Factures réglées sans demande d’avis</h2>
          {!autoRequests && <Link href="/parametres/relances" className="text-sm text-indigo-600">Automatiser les demandes</Link>}
        </div>
        {overview.reviewableInvoices.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Aucune. Les factures apparaissent ici dès que vous enregistrez leur règlement.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {overview.reviewableInvoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span>{invoice.number} · {invoice.clientName ?? 'Client'}{invoice.paidAt ? ` · réglée le ${new Date(invoice.paidAt).toLocaleDateString('fr-FR')}` : ''}</span>
                <button type="button" disabled={pending} onClick={() => request(invoice.id)} className="rounded-md border border-indigo-600 px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">Demander un avis</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overview.pending.length > 0 && (
        <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Demandes en attente</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {overview.pending.map((pendingRequest) => (
              <li key={pendingRequest.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span>
                  {pendingRequest.invoiceNumber ?? '—'} · {pendingRequest.clientName ?? pendingRequest.email}
                  <span className="text-gray-500"> · {pendingRequest.automatic ? 'automatique' : 'manuelle'} · {pendingRequest.expired ? 'expirée' : `expire le ${new Date(pendingRequest.expiresAt).toLocaleDateString('fr-FR')}`}</span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => {
                    const result = await revokeReviewRequestAction({ requestId: pendingRequest.id });
                    setFeedback(result.ok ? { type: 'ok', text: 'Lien retiré. Vous pouvez en envoyer un nouveau.' } : { type: 'error', text: result.error });
                  })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Retirer le lien
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900">Avis reçus</h2>
        {overview.reviews.length === 0
          ? <p className="mt-2 text-sm text-gray-500">Aucun avis pour le moment.</p>
          : <ul className="divide-y divide-gray-100">{overview.reviews.map((review) => <ReviewCard key={review.id} review={review} isAdmin={isAdmin} />)}</ul>}
      </section>
    </div>
  );
}
