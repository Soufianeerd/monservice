import { Metadata } from 'next';
import { SUBPROCESSORS } from '@/lib/legal/subprocessors';

export const metadata: Metadata = {
  title: 'Sous-traitants | MonService',
  description: 'Liste des sous-traitants ultérieurs de MonService (RGPD, article 28).',
};

export default function SousTraitantsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Sous-traitants</h1>
      <p className="text-gray-700 mb-8">
        Prestataires techniques qui traitent des données pour le compte de MonService, et donc de ses clients
        (article 28 du RGPD). Tout ajout ou remplacement est annoncé à l’avance, conformément au{' '}
        <a href="/contrat-de-sous-traitance" className="text-indigo-700 underline">contrat de sous-traitance</a>.
      </p>
      <div className="overflow-x-auto bg-white shadow sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <caption className="sr-only">Liste des sous-traitants ultérieurs</caption>
          <thead className="bg-gray-50">
            <tr>
              {['Prestataire', 'Service', 'Données concernées', 'Localisation', 'Garanties'].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {SUBPROCESSORS.map((s) => (
              <tr key={s.name}>
                <th scope="row" className="px-4 py-3 text-left font-medium text-gray-900">{s.name}</th>
                <td className="px-4 py-3 text-gray-700">{s.service}</td>
                <td className="px-4 py-3 text-gray-700">{s.data}</td>
                <td className="px-4 py-3 text-gray-700">{s.location}</td>
                <td className="px-4 py-3 text-gray-700">{s.safeguard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs text-gray-600">Dernière mise à jour : 21 novembre 2026.</p>
    </div>
  );
}
