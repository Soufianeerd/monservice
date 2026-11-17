import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe, Mail, MapPin, Phone, Star } from 'lucide-react';
import { getFieldServiceProfession } from '@/lib/workspaces/field-service/professions';
import { getPublicProfessional, type PublicProfessional } from '@/lib/services/public-profile.service';

type Props = { params: Promise<{ slug: string }> };

function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured && URL.canParse(configured) ? configured : 'https://monservicecrm.netlify.app';
}

function activityLabel(pro: PublicProfessional): string | null {
  return getFieldServiceProfession(pro.profession)?.label ?? null;
}

function locality(pro: PublicProfessional): string | null {
  return [pro.postalCode, pro.city].filter(Boolean).join(' ') || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pro = await getPublicProfessional(slug);
  if (!pro) return { title: 'Professionnel introuvable', robots: { index: false, follow: false } };
  const activity = activityLabel(pro);
  const where = pro.city ?? pro.interventionCities[0] ?? null;
  const title = [pro.name, activity, where].filter(Boolean).join(' — ');
  const description = (pro.headline ?? pro.about ?? `${pro.name}${activity ? `, ${activity.toLowerCase()}` : ''}${where ? ` à ${where}` : ''}.`).slice(0, 160);
  const url = `${appBaseUrl()}/pro/${pro.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'profile' } };
}

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex text-yellow-400" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-current' : 'text-gray-300'}`} aria-hidden="true" />
      ))}
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

// Vitrine publique : uniquement ce que le professionnel a choisi de publier,
// et des avis qui proviennent tous d'un client ayant réglé une facture.
export default async function PublicProfessionalPage({ params }: Props) {
  const { slug } = await params;
  const pro = await getPublicProfessional(slug);
  if (!pro) notFound();

  const activity = activityLabel(pro);
  const place = locality(pro);
  const url = `${appBaseUrl()}/pro/${pro.slug}`;
  // Données structurées sans note agrégée : Google n'affiche pas les avis
  // qu'une entreprise collecte sur sa propre page.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: pro.name,
    url,
    description: pro.headline ?? pro.about ?? undefined,
    telephone: pro.phone ?? undefined,
    email: pro.email ?? undefined,
    address: place ? { '@type': 'PostalAddress', addressLocality: pro.city ?? undefined, postalCode: pro.postalCode ?? undefined, addressCountry: 'FR' } : undefined,
    areaServed: pro.interventionCities.length ? pro.interventionCities.map((name) => ({ '@type': 'City', name })) : undefined,
    sameAs: pro.website ? [pro.website] : undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
          <p className="text-sm font-medium text-indigo-600">{[activity, place].filter(Boolean).join(' · ')}</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900" data-testid="public-pro-name">{pro.name}</h1>
          {pro.headline && <p className="mt-2 text-lg text-gray-600">{pro.headline}</p>}
          {pro.reviewCount > 0 && pro.ratingAverage !== null && (
            <a href="#avis" className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
              <Stars value={pro.ratingAverage} />
              <span><strong>{pro.ratingAverage.toLocaleString('fr-FR')}</strong>/5 · {pro.reviewCount} avis vérifié{pro.reviewCount > 1 ? 's' : ''}</span>
            </a>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {pro.phone && (
              <a href={`tel:${pro.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Phone className="h-4 w-4" aria-hidden="true" /> {pro.phone}
              </a>
            )}
            {pro.email && (
              <a href={`mailto:${pro.email}?subject=${encodeURIComponent('Demande de devis')}`} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Mail className="h-4 w-4" aria-hidden="true" /> Demander un devis
              </a>
            )}
            {pro.website && (
              <a href={pro.website} rel="noopener nofollow" target="_blank" className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Globe className="h-4 w-4" aria-hidden="true" /> Site web
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {pro.about && (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Présentation</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{pro.about}</p>
            </section>
          )}

          {pro.portfolio.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Réalisations</h2>
              <ul className="mt-4 space-y-4">
                {pro.portfolio.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="border-l-4 border-indigo-200 pl-4">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {[item.city, item.completedOn ? dateFormat.format(new Date(`${item.completedOn}T00:00:00Z`)) : null].filter(Boolean).join(' · ')}
                    </p>
                    {item.description && <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{item.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="avis" className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Avis clients</h2>
            <p className="mt-1 text-xs text-gray-500">
              Chaque avis provient d’un client ayant réglé une facture, invité par un lien personnel à usage unique. L’entreprise ne peut ni modifier ni supprimer un avis.
            </p>
            {pro.reviews.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">Aucun avis publié pour le moment.</p>
            ) : (
              <ul className="mt-4 divide-y divide-gray-100">
                {pro.reviews.map((review, index) => (
                  <li key={`${review.createdAt}-${index}`} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="text-sm font-medium text-gray-900">{review.author}</span>
                      <span className="text-xs text-gray-500">{review.createdAt ? dateFormat.format(new Date(review.createdAt)) : ''}</span>
                    </div>
                    {review.comment && <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{review.comment}</p>}
                    {review.reply && (
                      <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                        <p className="text-xs font-semibold text-gray-500">Réponse de {pro.name}</p>
                        <p className="mt-1 whitespace-pre-line">{review.reply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {(pro.serviceArea || pro.interventionCities.length > 0) && (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><MapPin className="h-4 w-4" aria-hidden="true" /> Zone d’intervention</h2>
              {pro.serviceArea && <p className="mt-2 text-sm text-gray-700">{pro.serviceArea}</p>}
              {pro.interventionCities.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {pro.interventionCities.map((city) => (
                    <li key={city} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{city}</li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {pro.services.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900">Prestations</h2>
              <ul className="mt-3 space-y-1 text-sm text-gray-700 list-disc list-inside">
                {pro.services.map((service) => <li key={service}>{service}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </main>

      <footer className="max-w-4xl mx-auto px-4 pb-10 sm:px-6 text-xs text-gray-500">
        Page publiée avec <Link href="/" className="text-indigo-600 hover:text-indigo-700">MonService</Link>.
      </footer>
    </div>
  );
}
