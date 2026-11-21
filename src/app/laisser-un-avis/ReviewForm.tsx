'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { submitReviewAction } from '@/app/actions/growth.actions';

const LABELS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent'];

export default function ReviewForm({ token, suggestedName, organizationName }: { token: string; suggestedName: string; organizationName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-800" data-testid="review-thanks">
        Merci ! Votre avis sur {organizationName} est publié.
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (rating < 1) {
          setError('Choisissez une note de 1 à 5 étoiles.');
          return;
        }
        startTransition(async () => {
          const result = await submitReviewAction({ token, rating, comment, displayName });
          if (result.ok) setDone(true);
          else setError(result.error);
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-medium text-gray-700">Votre note</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} étoile${value > 1 ? 's' : ''} — ${LABELS[value]}`}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              className="rounded p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Star className={`h-8 w-8 ${value <= shown ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600" aria-live="polite">{shown ? LABELS[shown] : ''}</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700">Votre commentaire (facultatif)</label>
        <textarea
          id="review-comment"
          rows={5}
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Qualité du travail, ponctualité, propreté du chantier, relation…"
        />
        <p className="mt-1 text-xs text-gray-500">N’indiquez ni adresse, ni numéro de téléphone, ni information personnelle.</p>
      </div>
      <div>
        <label htmlFor="review-name" className="block text-sm font-medium text-gray-700">Nom affiché</label>
        <input
          id="review-name"
          maxLength={60}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">Par exemple votre prénom et l’initiale de votre nom.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? 'Envoi…' : 'Publier mon avis'}
      </button>
      <p className="text-xs text-gray-500">
        En publiant, vous acceptez que votre note, votre commentaire et le nom affiché soient visibles publiquement. Vous pouvez demander leur suppression à MonService à tout moment.
      </p>
    </form>
  );
}
