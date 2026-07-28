import { Invoice } from '@/lib/data/interfaces';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EyeIcon, DownloadIcon } from 'lucide-react';
import { generateInvoicePDF } from '@/lib/utils/pdf-generator';

export default function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Payée</span>;
      case 'overdue': return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">En retard</span>;
      case 'sent': return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">En attente</span>;
      default: return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      alert('Génération PDF (Simulée) pour ' + invoice.number);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture n°</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date d'émission</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date d'échéance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map(invoice => (
            <tr key={invoice.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.number}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getStatusBadge(invoice.status)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(invoice.createdAt), 'PP', { locale: fr })}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.dueDate ? format(new Date(invoice.dueDate), 'PP', { locale: fr }) : '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{invoice.totalTTC} €</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-3">
                  <Link href={`/client/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900" aria-label="Voir">
                    <EyeIcon className="w-5 h-5" />
                  </Link>
                  <button onClick={() => handleDownload(invoice)} className="text-gray-600 hover:text-gray-900" aria-label="Télécharger PDF">
                    <DownloadIcon className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                Aucune facture trouvée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
