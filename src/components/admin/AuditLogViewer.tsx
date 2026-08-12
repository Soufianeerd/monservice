'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/admin/audit');
        const data = await res.json();
        if (res.ok) {
          setLogs(data.logs);
        } else {
          toast.error(data.error || 'Failed to fetch logs');
        }
      } catch (e) {
        toast.error('Error fetching logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const exportLogs = (format: 'csv' | 'json') => {
    window.location.href = `/api/admin/audit/export?format=${format}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Journaux d'audit</h2>
          <p className="text-sm text-gray-500">
            Historique de toutes les actions critiques de l'organisation.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => exportLogs('csv')}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportLogs('json')}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entité</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Chargement...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucun log trouvé.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.userId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.entityType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono text-xs">{log.entityId || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
