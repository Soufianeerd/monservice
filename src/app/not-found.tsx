import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4" data-testid="not-found">
        <h1 className="text-xl font-bold text-gray-900">Page introuvable</h1>
        <p className="text-sm text-gray-600">Cette adresse n’existe pas ou n’est plus disponible.</p>
        <div className="flex flex-col gap-2">
          <Link href="/dashboard" className="rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">
            Aller au tableau de bord
          </Link>
          <Link href="/" className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
