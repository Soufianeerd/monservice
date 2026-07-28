import { Invoice } from '@/lib/data/interfaces';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EyeIcon } from 'lucide-react';

export default function QuoteList({ quotes }: { quotes: Invoice[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Brouillon</span>;
      case 'sent': return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Envoyé / En attente</span>;
      case 'viewed': return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Vu</span>;
      case 'paid': return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepté</span>;
      case 'cancelled': return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Refusé / Annulé</span>;
      default: return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devis n°</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {quotes.map(quote => (
            <tr key={quote.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.number}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getStatusBadge(quote.status)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(quote.createdAt), 'PP', { locale: fr })}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{quote.totalTTC} €</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link href={`/client/quotes/${quote.id}`} className="text-indigo-600 hover:text-indigo-900">
                  <EyeIcon className="w-5 h-5 ml-auto" />
                </Link>
              </td>
            </tr>
          ))}
          {quotes.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                Aucun devis reçu.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
