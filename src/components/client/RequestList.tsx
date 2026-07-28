'use client';

import { Request } from '@/lib/data/interfaces';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EyeIcon, EditIcon, TrashIcon } from 'lucide-react';

export default function RequestList({ requests, onDelete }: { requests: Request[], onDelete: (id: string) => void }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Brouillon</span>;
      case 'published': return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Publiée</span>;
      case 'in_progress': return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">En cours</span>;
      case 'completed': return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Terminée</span>;
      case 'cancelled': return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Annulée</span>;
      default: return null;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date souhaitée</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map(request => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.title}</div>
                <div className="text-sm text-gray-500">{request.location}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(request.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {request.category}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {request.preferredDate ? format(new Date(request.preferredDate), 'PP', { locale: fr }) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <Link href={`/client/requests/${request.id}`} className="text-indigo-600 hover:text-indigo-900" aria-label="Voir">
                    <EyeIcon className="w-5 h-5" />
                  </Link>
                  <Link href={`/client/requests/${request.id}/edit`} className="text-gray-600 hover:text-gray-900" aria-label="Modifier">
                    <EditIcon className="w-5 h-5" />
                  </Link>
                  <button onClick={() => onDelete(request.id)} className="text-red-600 hover:text-red-900" aria-label="Supprimer">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                Aucune demande trouvée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
