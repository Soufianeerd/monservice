import ClientList from '@/components/demo/ClientList';
import Link from 'next/link';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Liste des clients</h1>
            <p className="mt-2 text-sm text-gray-500">
              Démo de la couche de données locale fonctionnant de manière asynchrone.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Retour à l'accueil
          </Link>
        </div>

        <ClientList />
      </div>
    </div>
  );
}
