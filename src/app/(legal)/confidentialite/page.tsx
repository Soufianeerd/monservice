import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-indigo text-gray-500">
        <h1>Politique de Confidentialité</h1>
        <p>En vigueur au 15/08/2026</p>
        <h2>Données collectées</h2>
        <p>Nous collectons les données strictement nécessaires au fonctionnement de MonService : nom, email, entreprise, secteur. Aucune donnée n'est revendue à des tiers.</p>
        <h2>Vos droits</h2>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.</p>
        <div className="mt-8">
          <Link href="/" className="text-indigo-600 hover:underline">&larr; Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
