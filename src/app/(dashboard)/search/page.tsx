'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { globalSearch, SearchResult } from '@/utils/search';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadResults() {
      if (!user?.organizationId || !query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await globalSearch(query, user.organizationId);
        setResults(data);
      } catch (error) {
        console.error('Erreur recherche', error);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [query, user]);

  // Grouper les résultats par type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  if (!query) {
    return <div className="p-8 text-center text-gray-500">Veuillez entrer une recherche.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Recherche en cours...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Résultats de recherche</h1>
        <p className="mt-1 text-sm text-gray-500">
          {results.length} résultat{results.length !== 1 ? 's' : ''} pour &quot;{query}&quot;
        </p>
      </div>

      {results.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg shadow border border-gray-200">
          <p className="text-gray-500">Aucun résultat ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedResults).map(([type, items]) => (
            <div key={type} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900 capitalize">{type.toLowerCase()}s ({items.length})</h2>
              </div>
              <ul className="divide-y divide-gray-200">
                {items.map(item => (
                  <li key={item.id}>
                    <Link href={item.url} className="block hover:bg-gray-50 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">{item.title}</p>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
        <SearchResultsContent />
      </Suspense>
    </div>
  );
}
