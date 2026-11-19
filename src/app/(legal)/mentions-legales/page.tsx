import { Metadata } from 'next';
import { connection } from 'next/server';
import { getPublisher, isPublisherComplete, SITE_HOST } from '@/lib/legal/publisher';

export const metadata: Metadata = {
  title: 'Mentions légales | MonService',
  description: 'Mentions légales de la plateforme MonService.',
};

const MISSING = 'Information en cours de publication';

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm sm:mt-0 sm:col-span-2 ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>{value ?? MISSING}</dd>
    </div>
  );
}

export default async function MentionsLegalesPage() {
  // Lu à chaque requête : l'identité vient de la configuration du serveur.
  await connection();
  const publisher = getPublisher();
  const complete = isPublisherComplete(publisher);
  const vat = publisher.vatId ?? (publisher.vatExempt ? 'TVA non applicable, article 293 B du CGI' : null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions légales</h1>
      {!complete && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Certaines informations sur l’éditeur sont en cours de publication.
        </p>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Éditeur du site</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <Row label="Éditeur" value={publisher.name} />
            <Row label="Statut" value={publisher.legalForm} />
            <Row label="Adresse" value={publisher.address} />
            <Row label="E-mail" value={publisher.email} />
            {publisher.phone && <Row label="Téléphone" value={publisher.phone} />}
            <Row label="SIRET" value={publisher.siret} />
            <Row label="TVA" value={vat} />
            <Row label="Directeur de la publication" value={publisher.director} />
          </dl>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Hébergement</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <Row label="Hébergeur du site" value={SITE_HOST.name} />
            <Row label="Adresse" value={SITE_HOST.address} />
            <Row label="Données" value="Base de données hébergée par Neon, région Francfort (Union européenne)" />
          </dl>
        </div>
      </div>
    </div>
  );
}
