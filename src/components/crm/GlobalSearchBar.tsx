'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

// We will fetch search results from our API or utility
import { globalSearch, SearchResult } from '@/utils/search';
import { useAuth } from '@/components/auth/AuthContext';

export default function GlobalSearchBar() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2 || !user?.organizationId) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await globalSearch(query, user.organizationId);
        setResults(data.slice(0, 8)); // limit to 8 in dropdown
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchResults();
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        setIsOpen(false);
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative max-w-lg w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="text-gray-900 block w-full pl-10 pr-16 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Recherche globale..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-400 text-xs border border-gray-300 rounded px-1.5 py-0.5">⌘K</span>
        </div>
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-500 text-center">Recherche...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">Aucun résultat trouvé pour "{query}"</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    onClick={() => handleSelect(result.url)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">{result.title}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{result.subtitle}</p>
                  </button>
                </li>
              ))}
              <li className="bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => handleSelect(`/search?q=${encodeURIComponent(query)}`)}
                  className="w-full text-center px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Voir tous les résultats
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
