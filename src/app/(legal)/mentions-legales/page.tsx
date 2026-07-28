import Link from 'next/link';

export default function LegalMentions() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-indigo text-gray-500">
        <h1>Mentions Légales</h1>
        <p>En vigueur au 15/08/2026</p>
        <h2>Éditeur du site</h2>
        <p>Le site MonService est édité par la société MonService SAS, au capital de 10 000 euros, immatriculée au Registre du Commerce et des Sociétés sous le numéro 123 456 789, dont le siège social est situé à Paris.</p>
        <h2>Hébergement</h2>
        <p>Ce site est hébergé par Vercel Inc. et les bases de données par notre fournisseur de cloud local.</p>
        <div className="mt-8">
          <Link href="/" className="text-indigo-600 hover:underline">&larr; Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
