'use client';

import React from 'react';
import Link from 'next/link';
import { Edit, Eye } from 'lucide-react';
import { Deal, DealStatus, Client } from '@/lib/data/interfaces';
import { DEAL_STATUS_LABELS } from '@/lib/constants/statuses';
import { Select } from '@/components/ui/Select';

interface DealPipelineProps {
  deals: Deal[];
  clients: Client[];
  onStatusChange: (dealId: string, newStatus: DealStatus) => Promise<void>;
}

const STAGES: DealStatus[] = ['prospect', 'qualification', 'negotiation', 'proposal', 'won', 'lost'];

export default function DealPipeline({ deals, clients, onStatusChange }: DealPipelineProps) {
  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Client supprimé';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('fr-FR').format(new Date(dateString));
  };

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.status === stage);
    return acc;
  }, {} as Record<DealStatus, Deal[]>);

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4 snap-x">
      {STAGES.map(stage => (
        <div key={stage} className="flex-shrink-0 w-80 sm:w-72 bg-gray-50 rounded-lg shadow border border-gray-200 flex flex-col max-h-[80vh] snap-center">
          <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">{DEAL_STATUS_LABELS[stage]}</h2>
            <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full font-medium">
              {dealsByStage[stage].length}
            </span>
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {dealsByStage[stage].map(deal => (
              <div key={deal.id} className="bg-white p-4 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 truncate pr-2">{deal.name}</h3>
                  <div className="flex space-x-2">
                    <Link href={`/deals/${deal.id}`} className="text-gray-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${deal.name}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/deals/${deal.id}/edit`} className="text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${deal.name}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mb-1">
                  {clients.find(c => c.id === deal.clientId) ? getClientName(deal.clientId) : (
                    <span className="italic bg-gray-100 px-2 py-0.5 rounded text-xs">Client supprimé</span>
                  )}
                </p>
                <p className="text-sm font-semibold text-gray-700 mb-3">{formatCurrency(deal.value)}</p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Clôture: {formatDate(deal.expectedCloseDate)}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Select 
                    value={deal.status}
                    onChange={(e) => onStatusChange(deal.id, e.target.value as DealStatus)}
                    label={`Statut de ${deal.name}`}
                    hideLabel
                    className="text-xs py-1 px-2"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{DEAL_STATUS_LABELS[s]}</option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
            
            {dealsByStage[stage].length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400 italic">
                Aucun deal
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
