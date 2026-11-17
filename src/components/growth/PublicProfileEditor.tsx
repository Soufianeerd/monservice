'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, Trash2 } from 'lucide-react';
import { deletePortfolioItemAction, savePortfolioItemAction, savePublicProfileAction } from '@/app/actions/growth.actions';
import { MAX_INTERVENTION_CITIES, MAX_PUBLIC_SERVICES, parseList, publicProfilePath, slugify } from '@/lib/growth/public-profile';
import type { OwnPublicProfile, PortfolioItem } from '@/lib/services/public-profile.service';

const input = 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50';

type Feedback = { type: 'ok' | 'error'; text: string } | null;

export default function PublicProfileEditor({ initial, portfolio, isAdmin, organization }: {
  initial: OwnPublicProfile;
  portfolio: PortfolioItem[];
  isAdmin: boolean;
  organization: { name: string; phone: string | null; email: string | null; city: string | null };
}) {
  const [profile, setProfile] = useState(initial);
  const [cities, setCities] = useState(initial.interventionCities.join(', '));
  const [services, setServices] = useState(initial.services.join('\n'));
  const [savedSlug, setSavedSlug] = useState(initial.exists ? initial.slug : null);
  const [savedPublished, setSavedPublished] = useState(initial.exists && initial.published);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();
  const disabled = !isAdmin || pending;
  const set = <K extends keyof OwnPublicProfile>(key: K, value: OwnPublicProfile[K]) => setProfile((current) => ({ ...current, [key]: value }));

  const [item, setItem] = useState({ title: '', description: '', city: '', completedOn: '' });
  const [itemFeedback, setItemFeedback] = useState<Feedback>(null);

  return (
    <div className="space-y-6" data-testid="public-profile-editor">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vitrine publique</h2>
          <p className="mt-1 text-sm text-gray-500">
            Une page à votre nom, référencée par les moteurs de recherche, avec vos avis clients vérifiés. Rien n’y figure que vous n’ayez choisi.
          </p>
        </div>
        {savedSlug && savedPublished && (
          <Link href={publicProfilePath(savedSlug)} target="_blank" className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Voir ma vitrine <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!isAdmin && <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">Seul un administrateur de l’organisation peut modifier la vitrine.</p>}

      <form
        className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setFeedback(null);
          const payload = {
            ...profile,
            interventionCities: parseList(cities, MAX_INTERVENTION_CITIES),
            services: parseList(services, MAX_PUBLIC_SERVICES),
          };
          startTransition(async () => {
            const result = await savePublicProfileAction(payload);
            if (result.ok) {
              setSavedSlug(result.data.slug);
              setSavedPublished(payload.published);
              setFeedback({ type: 'ok', text: payload.published ? 'Vitrine publiée.' : 'Enregistré. La vitrine reste hors ligne tant qu’elle n’est pas publiée.' });
            } else {
              setFeedback({ type: 'error', text: result.error });
            }
          });
        }}
      >
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Adresse de la page</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-gray-500">/pro/</span>
            <input
              value={profile.slug}
              disabled={disabled}
              onChange={(event) => set('slug', event.target.value.toLowerCase())}
              onBlur={() => set('slug', slugify(profile.slug))}
              className={input}
              required
              minLength={3}
              maxLength={60}
            />
          </div>
          <span className="mt-1 block text-xs text-gray-500">Par exemple le nom de l’entreprise et la ville. Changer l’adresse casse les liens déjà partagés.</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Accroche</span>
          <input value={profile.headline} disabled={disabled} maxLength={120} onChange={(event) => set('headline', event.target.value)} className={input} placeholder="Plombier chauffagiste à Metz, dépannage sous 24 h" />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Présentation</span>
          <textarea value={profile.about} disabled={disabled} maxLength={4000} rows={6} onChange={(event) => set('about', event.target.value)} className={input} placeholder="Votre parcours, vos garanties, vos certifications (RGE, Qualibat…), ce qui vous distingue." />
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Zone d’intervention</span>
            <input value={profile.serviceArea} disabled={disabled} maxLength={300} onChange={(event) => set('serviceArea', event.target.value)} className={input} placeholder="Metz et 30 km alentour" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Villes desservies (séparées par des virgules)</span>
            <input value={cities} disabled={disabled} onChange={(event) => setCities(event.target.value)} className={input} placeholder="Metz, Woippy, Montigny-lès-Metz" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Prestations (une par ligne)</span>
          <textarea value={services} disabled={disabled} rows={4} onChange={(event) => setServices(event.target.value)} className={input} placeholder={'Dépannage plomberie\nRénovation de salle de bain\nEntretien de chaudière'} />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Site web</span>
          <input value={profile.website} disabled={disabled} maxLength={300} onChange={(event) => set('website', event.target.value)} className={input} placeholder="https://" />
        </label>

        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium text-gray-700">Coordonnées affichées</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={profile.showPhone} disabled={disabled || !organization.phone} onChange={(event) => set('showPhone', event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            Téléphone {organization.phone ? `(${organization.phone})` : '— à renseigner dans Organisation'}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={profile.showEmail} disabled={disabled || !organization.email} onChange={(event) => set('showEmail', event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
            E-mail, avec un bouton « Demander un devis » {organization.email ? `(${organization.email})` : '— à renseigner dans Organisation'}
          </label>
        </fieldset>

        <label className="flex items-center gap-2 rounded-md bg-gray-50 p-3 text-sm">
          <input type="checkbox" checked={profile.published} disabled={disabled} onChange={(event) => set('published', event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
          <span><strong>Publier la vitrine</strong> — visible par tous et proposée aux moteurs de recherche.</span>
        </label>

        {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-sm ${feedback.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{feedback.text}</p>}
        {isAdmin && (
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </form>

      <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Réalisations</h3>
          <p className="text-sm text-gray-500">Vos chantiers et prestations marquantes, du plus récent au plus ancien. N’y mentionnez pas le nom de vos clients sans leur accord.</p>
        </div>
        {portfolio.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {portfolio.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{entry.title}</p>
                  <p className="text-xs text-gray-500">{[entry.city, entry.completedOn].filter(Boolean).join(' · ')}</p>
                  {entry.description && <p className="mt-1 text-sm text-gray-700">{entry.description}</p>}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={`Supprimer ${entry.title}`}
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const result = await deletePortfolioItemAction({ id: entry.id });
                      setItemFeedback(result.ok ? { type: 'ok', text: 'Réalisation supprimée.' } : { type: 'error', text: result.error });
                    })}
                    className="rounded p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isAdmin && (
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setItemFeedback(null);
              startTransition(async () => {
                const result = await savePortfolioItemAction({
                  title: item.title,
                  description: item.description,
                  city: item.city,
                  completedOn: item.completedOn || null,
                  position: 0,
                });
                if (result.ok) {
                  setItem({ title: '', description: '', city: '', completedOn: '' });
                  setItemFeedback({ type: 'ok', text: 'Réalisation ajoutée.' });
                } else {
                  setItemFeedback({ type: 'error', text: result.error });
                }
              });
            }}
          >
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Titre</span>
              <input value={item.title} required maxLength={120} onChange={(event) => setItem({ ...item, title: event.target.value })} className={input} placeholder="Rénovation complète d’une salle de bain" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Ville</span>
              <input value={item.city} maxLength={80} onChange={(event) => setItem({ ...item, city: event.target.value })} className={input} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Date de fin</span>
              <input type="date" value={item.completedOn} onChange={(event) => setItem({ ...item, completedOn: event.target.value })} className={input} />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Description</span>
              <textarea value={item.description} maxLength={1000} rows={3} onChange={(event) => setItem({ ...item, description: event.target.value })} className={input} />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={pending} className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">Ajouter la réalisation</button>
            </div>
          </form>
        )}
        {itemFeedback && <p role={itemFeedback.type === 'error' ? 'alert' : 'status'} className={`text-sm ${itemFeedback.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{itemFeedback.text}</p>}
      </section>
    </div>
  );
}
