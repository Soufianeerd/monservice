'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Deal, Invoice, Task, Client } from '@/lib/data/interfaces';

interface AdvancedReportsProps {
  deals: Deal[];
  invoices: Invoice[];
  tasks: Task[];
  clients: Client[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdvancedReports({ deals, invoices, tasks, clients }: AdvancedReportsProps) {
  
  // 1. Évolution du CA Mensuel (Factures payées)
  const monthlyRevenue = React.useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      
      const revenue = invoices
        .filter(inv => {
          if (inv.status !== 'paid') return false;
          const invDate = new Date(inv.paidAt || inv.date);
          return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.totalHT, 0);

      data.push({ name: monthStr, CA: revenue });
    }
    return data;
  }, [invoices]);

  // 2. Répartition des Deals par statut
  const dealsByStage = React.useMemo(() => {
    const stages = ['Prospect', 'Qualification', 'Proposition', 'Négociation', 'Gagné', 'Perdu'];
    return stages.map(stage => ({
      name: stage,
      value: deals.filter(d => d.stage === stage).length
    })).filter(item => item.value > 0);
  }, [deals]);

  // 3. Top 5 Clients par CA facturé (hors devis et brouillons)
  const topClients = React.useMemo(() => {
    const clientRevenue: Record<string, number> = {};
    
    invoices.filter(i => i.type === 'invoice' && i.status !== 'draft').forEach(inv => {
      clientRevenue[inv.clientId] = (clientRevenue[inv.clientId] || 0) + inv.totalHT;
    });

    return Object.entries(clientRevenue)
      .map(([clientId, total]) => {
        const client = clients.find(c => c.id === clientId);
        return { name: client?.name || 'Inconnu', total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices, clients]);

  // 4. Factures Impayées (overdue ou sent)
  const unpaidInvoices = React.useMemo(() => {
    return invoices
      .filter(i => i.type === 'invoice' && (i.status === 'sent' || i.status === 'overdue'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices]);

  // 5. KPIs
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalHT, 0);
  const totalPending = unpaidInvoices.reduce((sum, i) => sum + i.totalHT, 0);
  const conversionRate = deals.length > 0 
    ? Math.round((deals.filter(d => d.stage === 'Gagné').length / deals.length) * 100) 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex justify-end">
        <button
          onClick={() => {
            alert('Génération du PDF en cours... (Simulation)');
            window.print();
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          📄 Exporter en PDF
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">CA Total Encaissé (HT)</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Factures En Attente (HT)</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Taux de Conversion (Deals)</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{conversionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart: CA Mensuel */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution du CA (6 derniers mois)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="CA" fill="#4f46e5" name="CA HT Encaissé" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Deals by stage */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition des Deals</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dealsByStage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dealsByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top 5 Clients (CA Facturé)</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {topClients.length > 0 ? topClients.map((client, idx) => (
              <li key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <span className="font-medium text-gray-900">{client.name}</span>
                <span className="text-gray-600 font-semibold">{formatCurrency(client.total)}</span>
              </li>
            )) : (
              <li className="p-4 text-center text-gray-500">Aucune donnée.</li>
            )}
          </ul>
        </div>

        {/* Factures Impayées */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Factures Impayées</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
            {unpaidInvoices.length > 0 ? unpaidInvoices.map((inv) => (
              <li key={inv.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{inv.number}</p>
                  <p className="text-xs text-gray-500">Client: {clients.find(c => c.id === inv.clientId)?.name || 'Inconnu'}</p>
                </div>
                <div className="text-right">
                  <span className="text-red-600 font-semibold">{formatCurrency(inv.totalTTC)} TTC</span>
                  <p className="text-xs text-gray-500 mt-1">
                    Échéance: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
              </li>
            )) : (
              <li className="p-4 text-center text-gray-500">Aucune facture en retard.</li>
            )}
          </ul>
        </div>
      </div>
      
    </div>
  );
}
