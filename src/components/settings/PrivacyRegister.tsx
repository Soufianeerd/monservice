'use client';

import { useState, useEffect } from 'react';
import { ProcessingActivity } from '@/lib/data/interfaces/privacy.interface';
import { getOrganizationAction } from '@/app/actions/session';
import { Download, Plus } from 'lucide-react';

export default function PrivacyRegister() {
  const [activities, setActivities] = useState<ProcessingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch from an API
    // For now we mock the API response to demonstrate the UI
    const fetchActivities = async () => {
      try {
        const org = await getOrganizationAction();
        if (org) {
          // Mock data
          setActivities([
            {
              id: '1',
              organizationId: org.id,
              name: 'Gestion de la clientèle',
              purpose: 'Facturation et support',
              dataCategories: 'Identité, Coordonnées, Facturation',
              legalBasis: 'Contrat',
              retentionPeriod: '10 ans',
              responsible: 'DPO',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, []);

  const exportCSV = () => {
    // Mock export
    const csvContent = "data:text/csv;charset=utf-8,Name,Purpose,Legal Basis,Retention\nGestion de la clientèle,Facturation et support,Contrat,10 ans";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "registre_traitements.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Registre des traitements</h2>
          <p className="text-sm text-gray-500 mt-1">Conformément à l'Article 30 du RGPD</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportCSV}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </button>
          <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Traitement
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traitement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finalité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégories de données</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base légale</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conservation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun traitement enregistré
                  </td>
                </tr>
              ) : (
                activities.map(activity => (
                  <tr key={activity.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{activity.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{activity.purpose}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{activity.dataCategories}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.legalBasis}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.retentionPeriod}</td>
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
