import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — MonService',
  description: 'Informations légales relatives à l’éditeur du site MonService.',
};

/**
 * ⚠️ OBLIGATION LÉGALE (art. 6-III de la LCEN). Les champs entre crochets
 * doivent impérativement être complétés avant toute mise en ligne publique.
 */
export default function LegalNoticePage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-indigo text-gray-700">
        <h1>Mentions légales</h1>

        <h2>Éditeur</h2>
        <p>
          <strong>[RAISON SOCIALE]</strong>
          <br />
          [Forme juridique] au capital de [montant] €
          <br />
          Siège social : [adresse complète]
          <br />
          RCS [ville] — SIREN [numéro]
          <br />
          TVA intracommunautaire : [numéro]
          <br />
          Directeur de la publication : [nom]
          <br />
          Contact : [email] — [téléphone]
        </p>

        <h2>Hébergement</h2>
        <p>
          <strong>Netlify, Inc.</strong>
          <br />
          512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis
          <br />
          <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer">
            www.netlify.com
          </a>
        </p>
        <p>
          Base de données : <strong>Supabase</strong> — région [À PRÉCISER].
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments composant le site (structure, textes, logos, graphismes) est
          protégé par le droit de la propriété intellectuelle. Toute reproduction non autorisée est
          interdite.
        </p>

        <h2>Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre{' '}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>

        <div className="mt-8">
          <Link href="/" className="text-indigo-600 hover:underline">
            &larr; Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
