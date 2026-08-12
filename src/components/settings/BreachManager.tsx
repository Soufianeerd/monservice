'use client';

import { useState, useEffect } from 'react';
import { BreachNotification } from '@/lib/data/interfaces/privacy.interface';
import { getOrganizationAction } from '@/app/actions/session';
import { AlertTriangle, Plus } from 'lucide-react';

export default function BreachManager() {
  const [breaches, setBreaches] = useState<BreachNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBreaches = async () => {
      try {
        const org = await getOrganizationAction();
        if (org) {
          // Mock data
          setBreaches([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBreaches();
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Registre des Violations de Données</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez les incidents de sécurité (notification sous 72h)</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Déclarer un incident
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de découverte</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau de risque</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notifié (Autorité)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {breaches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-green-100 p-3 rounded-full mb-3">
                        <AlertTriangle className="w-6 h-6 text-green-600" />
                      </div>
                      <p>Aucun incident de sécurité enregistré.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                breaches.map(breach => (
                  <tr key={breach.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{breach.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{breach.discoveryDate.toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${breach.riskLevel === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {breach.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {breach.notifiedAuthority ? 'Oui' : 'Non'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {breach.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
