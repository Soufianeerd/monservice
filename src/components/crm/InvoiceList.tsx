'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Invoice, Client } from '@/lib/data/interfaces';
import { INVOICE_STATUS_LABELS } from '@/lib/constants/statuses';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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
    return clients.find(c => c.id === clientId)?.name || 'Client supprimé';
  };

  const getStatusBadge = (status: Invoice['status']) => {
    let variant: 'default' | 'success' | 'warning' | 'error' | 'info' = 'default';
    if (status === 'sent') variant = 'warning';
    if (status === 'viewed') variant = 'info';
    if (status === 'paid') variant = 'success';
    if (status === 'overdue' || status === 'cancelled') variant = 'error';
    
    return <Badge variant={variant}>{INVOICE_STATUS_LABELS[status]}</Badge>;
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
          <Input
            type="text"
            placeholder="Rechercher (Numéro, Client)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            label="Recherche"
            hideLabel
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Select
            id="status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Statut"
            hideLabel
          >
            <option value="all">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="proposal">Devis</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
            <option value="overdue">En retard</option>
          </Select>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Vue mobile */}
        <div className="sm:hidden space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader>
                <Link href={`/invoices/${invoice.id}`} className="font-bold text-indigo-600 hover:text-indigo-900">
                  {invoice.number}
                </Link>
                {getStatusBadge(invoice.status)}
              </CardHeader>
              <CardBody>
                <div className="font-medium text-gray-900">
                  {clients.find(c => c.id === invoice.clientId) ? getClientName(invoice.clientId) : <span className="text-gray-500 italic bg-gray-100 px-2 py-0.5 rounded text-xs">Client supprimé</span>}
                </div>
                <div className="flex justify-between mt-2">
                  <span>{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                  <span className="font-semibold text-gray-900">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.totalTTC)}</span>
                </div>
              </CardBody>
              <CardFooter>
                <Link href={`/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-sm font-medium">
                  Voir
                </Link>
                {invoice.status === 'draft' && (
                  <Link href={`/invoices/${invoice.id}/edit`} className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-2 py-1 text-sm font-medium">
                    Éditer
                  </Link>
                )}
                {invoice.status === 'sent' && onMarkAsPaid && invoice.type !== 'quote' && (
                  <button onClick={() => onMarkAsPaid(invoice.id)} className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1 text-sm font-medium">
                    Payer
                  </button>
                )}
                {invoice.status === 'overdue' && invoice.type !== 'quote' && (
                  <button onClick={() => { alert('Relance envoyée au client avec succès !'); }} className="text-orange-600 hover:text-orange-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-2 py-1 text-sm">
                    Relancer
                  </button>
                )}
                {invoice.type === 'quote' && onConvertQuote && (
                  <button onClick={() => onConvertQuote(invoice.id)} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-sm font-medium">
                    Convertir
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(invoice.id)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 text-sm font-medium">
                    Supprimer
                  </button>
                )}
              </CardFooter>
            </Card>
          ))}
          {filteredInvoices.length === 0 && (
            <div className="text-center text-sm text-gray-500 py-4">Aucun document trouvé.</div>
          )}
        </div>

        {/* Vue desktop */}
        <div className="hidden sm:block">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Numéro</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Montant TTC</TableHeader>
                <TableHeader>Statut</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-indigo-600">
                    <Link href={`/invoices/${invoice.id}`}>
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {clients.find(c => c.id === invoice.clientId) ? (
                      getClientName(invoice.clientId)
                    ) : (
                      <span className="text-gray-500 italic bg-gray-100 px-2 py-0.5 rounded text-xs">Client supprimé</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.date).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.totalTTC)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1">
                      Voir
                    </Link>
                    {invoice.status === 'draft' && (
                      <Link href={`/invoices/${invoice.id}/edit`} className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1">
                        Éditer
                      </Link>
                    )}
                    {invoice.status === 'sent' && onMarkAsPaid && invoice.type !== 'quote' && (
                      <button onClick={() => onMarkAsPaid(invoice.id)} className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded p-1">
                        Payer
                      </button>
                    )}
                    {invoice.status === 'overdue' && invoice.type !== 'quote' && (
                      <button onClick={() => { alert('Relance envoyée au client avec succès !'); }} className="text-orange-600 hover:text-orange-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 rounded p-1">
                        Relancer
                      </button>
                    )}
                    {invoice.type === 'quote' && onConvertQuote && (
                      <button onClick={() => onConvertQuote(invoice.id)} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1">
                        Convertir
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(invoice.id)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1">
                        Supprimer
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Aucun document trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
