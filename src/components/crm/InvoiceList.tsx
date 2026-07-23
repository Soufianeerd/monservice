'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Invoice, Client } from '@/lib/data/interfaces';

interface InvoiceListProps {
  invoices: Invoice[];
  clients: Client[];
  onDelete?: (id: string) => void;
  onMarkAsPaid?: (id: string) => void;
  onConvertQuote?: (id: string) => void;
}

export default function InvoiceList({ invoices, clients, onDelete, onMarkAsPaid, onConvertQuote }: InvoiceListProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Client inconnu';
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Brouillon</span>;
      case 'proposal':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Devis</span>;
      case 'sent':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Envoyée</span>;
      case 'paid':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Payée</span>;
      case 'overdue':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">En retard</span>;
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    const clientName = getClientName(invoice.clientId).toLowerCase();
    const matchesSearch = invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          clientName.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Rechercher (Numéro, Client)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="status" className="text-sm text-gray-500">Statut:</label>
          <select
            id="status"
            className="text-gray-900 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="proposal">Devis</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
            <option value="overdue">En retard</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                  <Link href={`/invoices/${invoice.id}`}>
                    {invoice.number}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getClientName(invoice.clientId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invoice.date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.totalTTC)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Link href={`/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900">
                    Voir
                  </Link>
                  {invoice.status === 'draft' && (
                    <Link href={`/invoices/${invoice.id}/edit`} className="text-gray-600 hover:text-gray-900">
                      Éditer
                    </Link>
                  )}
                  {invoice.status === 'sent' && onMarkAsPaid && invoice.type !== 'quote' && (
                    <button onClick={() => onMarkAsPaid(invoice.id)} className="text-green-600 hover:text-green-900">
                      Payer
                    </button>
                  )}
                  {invoice.status === 'overdue' && invoice.type !== 'quote' && (
                    <button onClick={() => { alert('Relance envoyée au client avec succès !'); }} className="text-orange-600 hover:text-orange-900 font-bold">
                      Relancer
                    </button>
                  )}
                  {invoice.type === 'quote' && onConvertQuote && (
                    <button onClick={() => onConvertQuote(invoice.id)} className="text-blue-600 hover:text-blue-900">
                      Convertir
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(invoice.id)} className="text-red-600 hover:text-red-900">
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucun document trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
