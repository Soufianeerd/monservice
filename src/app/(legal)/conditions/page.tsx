import Link from 'next/link';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-indigo text-gray-500">
        <h1>Conditions Générales d'Utilisation</h1>
        <p>En vigueur au 15/08/2026</p>
        <h2>1. Objet</h2>
        <p>Les présentes CGU définissent les conditions d'utilisation de la plateforme MonService par les Clients et Professionnels.</p>
        <h2>2. Accès au service</h2>
        <p>L'accès nécessite la création d'un compte avec des informations véridiques.</p>
        <h2>3. Responsabilité</h2>
        <p>MonService est un intermédiaire technique et ne saurait être tenu responsable de la qualité des prestations fournies par les professionnels.</p>
        <div className="mt-8">
          <Link href="/" className="text-indigo-600 hover:underline">&larr; Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
