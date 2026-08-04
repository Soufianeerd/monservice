'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { ActivityLog } from '@/lib/data/interfaces';
import ActivityFeed from '@/components/crm/ActivityFeed';

export default function ActivityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    async function loadLogs() {
      if (!user?.organizationId) return;
      setLoading(true);
      try {
        setLogs([]);
      } catch (error) {
        console.error('Erreur chargement logs', error);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [user]);

  const filteredLogs = filterType === 'ALL' 
    ? logs 
    : logs.filter(log => log.entityType === filterType);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal d&apos;Activité</h1>
          <p className="mt-1 text-sm text-gray-500">
            Suivez toutes les actions réalisées sur votre plateforme.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filtrer par :</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-gray-900 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="ALL">Toute l&apos;activité</option>
            <option value="CLIENT">Clients</option>
            <option value="CONTACT">Contacts</option>
            <option value="DEAL">Deals</option>
            <option value="TASK">Tâches</option>
            <option value="INVOICE">Factures / Devis</option>
            <option value="PRODUCT">Produits</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <ActivityFeed logs={filteredLogs} />
        )}
      </div>
    </div>
  );
}
