'use client';

import React from 'react';
import { ActivityLog } from '@/lib/data/interfaces';
import { CheckCircle, Edit, Plus, Trash2, Tag, RefreshCw } from 'lucide-react';

interface ActivityFeedProps {
  logs: ActivityLog[];
}

export default function ActivityFeed({ logs }: ActivityFeedProps) {
  
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus className="w-4 h-4 text-green-500" />;
      case 'UPDATE': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'STATUS_CHANGE': return <RefreshCw className="w-4 h-4 text-yellow-500" />;
      default: return <Tag className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getEntityLabel = (type: string) => {
    const types: Record<string, string> = {
      'CLIENT': 'Client',
      'CONTACT': 'Contact',
      'DEAL': 'Deal',
      'TASK': 'Tâche',
      'PRODUCT': 'Produit',
      'INVOICE': 'Facture/Devis',
      'TEMPLATE': 'Modèle'
    };
    return types[type] || type;
  };

  if (logs.length === 0) {
    return <div className="p-8 text-center text-gray-500">Aucune activité récente.</div>;
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {logs.map((log, logIdx) => (
          <li key={log.id}>
            <div className="relative pb-8">
              {logIdx !== logs.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center ring-8 ring-white">
                    {getActionIcon(log.action)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">{getEntityLabel(log.entityType)}</span>{' '}
                      - {log.details}
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-gray-500">
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
