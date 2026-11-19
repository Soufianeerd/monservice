import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

// S-05 : une seule offre, réellement disponible au lancement (LAUNCH_INCLUDED_PLAN=pro).
// Chaque ligne correspond à un parcours vérifié par la recette visuelle.
const INCLUDED = [
  'Clients, prospects et contacts sans limite',
  'Devis et factures en PDF, envoyés par e-mail à votre client',
  'Mentions légales, numérotation et TVA (ou franchise) gérées',
  'Suivi des règlements, relances et trésorerie',
  'Agenda, rendez-vous et disponibilités',
  'Chantiers et interventions pour les métiers du terrain',
  'Suivi des séances pour la santé et le bien-être',
  'Vitrine publique et demandes d’avis clients',
];

export default function Pricing() {
  return (
    <div id="pricing" className="py-24 bg-white relative">
      <div className="absolute inset-0 bg-gray-50/50 -skew-y-2 z-0 transform origin-top-left"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Gratuit pendant le lancement</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Toutes les fonctionnalités sont incluses, sans carte bancaire. Vous serez prévenu à l’avance
            avant toute évolution tarifaire, et libre de partir avec vos données.
          </p>
        </div>
        <div className="max-w-xl mx-auto rounded-2xl p-8 flex flex-col bg-white border-2 border-primary-600 shadow-xl">
          <h3 className="text-2xl font-bold text-gray-900">Offre de lancement</h3>
          <p className="mt-2 text-sm text-gray-500">Pour les indépendants, artisans, praticiens et petites équipes</p>
          <div className="mt-6 my-8 flex items-baseline gap-1">
            <span className="text-5xl font-extrabold text-gray-900">0 €</span>
            <span className="text-lg font-medium text-gray-500">pendant le lancement</span>
          </div>
          <ul className="flex-1 space-y-4 mb-8">
            {INCLUDED.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary-600" />
                <span className="text-gray-600 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="block w-full text-center py-3.5 px-4 rounded-xl font-semibold transition-all bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-200 hover:scale-[1.02]"
          >
            Créer mon espace
          </Link>
        </div>
      </div>
    </div>
  );
}
