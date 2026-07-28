import { Invoice } from '@/lib/data/interfaces';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function QuotesSentList({ quotes }: { quotes: Invoice[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'viewed':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">En attente</span>;
      case 'paid':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Accepté</span>;
      case 'cancelled':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Refusé</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
      <ul className="divide-y divide-gray-200">
        {quotes.length === 0 ? (
          <li className="px-6 py-8 text-center text-gray-500">
            Vous n'avez envoyé aucun devis pour le moment.
          </li>
        ) : (
          quotes.map((quote) => (
            <li key={quote.id}>
              <Link href={`/quotes/${quote.id}`} className="block hover:bg-gray-50 transition-colors">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      Devis n° {quote.number}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      {getStatusBadge(quote.status)}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Client ID : {quote.clientId.substring(0, 8)}...
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p className="mr-6 font-medium text-gray-900">
                        {quote.totalTTC.toFixed(2)} € TTC
                      </p>
                      <p>
                        Envoyé le {format(new Date(quote.createdAt), 'PP', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
