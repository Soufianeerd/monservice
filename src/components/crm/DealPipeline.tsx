'use client';

import React from 'react';
import Link from 'next/link';
import { Edit, Eye } from 'lucide-react';
import { Deal, DealStage, Client } from '@/lib/data/interfaces';

interface DealPipelineProps {
  deals: Deal[];
  clients: Client[];
  onStageChange: (dealId: string, newStage: DealStage) => Promise<void>;
}

const STAGES: DealStage[] = ['Prospect', 'Négociation', 'Gagné', 'Perdu'];

export default function DealPipeline({ deals, clients, onStageChange }: DealPipelineProps) {
  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Inconnu';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('fr-FR').format(new Date(dateString));
  };

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    // Also include 'Qualification' and 'Proposition' in 'Prospect' or 'Négociation'
    // if there are old deals with those statuses to avoid hiding them.
    if (stage === 'Prospect') {
      acc[stage] = [...acc[stage], ...deals.filter(d => d.stage === 'Qualification')];
    }
    if (stage === 'Négociation') {
      acc[stage] = [...acc[stage], ...deals.filter(d => d.stage === 'Proposition')];
    }
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {STAGES.map(stage => (
        <div key={stage} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg shadow border border-gray-200 flex flex-col max-h-[80vh]">
          <div className="p-3 border-b border-gray-200 bg-gray-100 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">{stage}</h3>
            <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full font-medium">
              {dealsByStage[stage].length}
            </span>
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {dealsByStage[stage].map(deal => (
              <div key={deal.id} className="bg-white p-4 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 truncate pr-2">{deal.name}</h4>
                  <div className="flex space-x-2">
                    <Link href={`/deals/${deal.id}`} className="text-gray-400 hover:text-indigo-600">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/deals/${deal.id}/edit`} className="text-gray-400 hover:text-blue-600">
                      <Edit className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mb-1">{getClientName(deal.clientId)}</p>
                <p className="text-sm font-semibold text-gray-700 mb-3">{formatCurrency(deal.value)}</p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Clôture: {formatDate(deal.expectedCloseDate)}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <select 
                    value={deal.stage}
                    onChange={(e) => onStageChange(deal.id, e.target.value as DealStage)}
                    className="text-gray-900 block w-full text-xs py-1 px-2 border-gray-300 bg-gray-50 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {deal.stage === 'Qualification' && <option value="Qualification">Qualification</option>}
                    {deal.stage === 'Proposition' && <option value="Proposition">Proposition</option>}
                  </select>
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
