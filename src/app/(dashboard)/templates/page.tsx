'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import * as messageTemplateActions from '@/app/actions/message-template.actions';
import { MessageTemplate } from '@/lib/data/interfaces';
import { Mail, MessageSquare } from 'lucide-react';

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    if (!user?.organizationId) return;
    await Promise.resolve();
      setLoading(true);
    try {
      const data = await messageTemplateActions.findAllAction(user.organizationId);
      setTemplates(data);
    } catch (error) {
      console.error('Erreur chargement modèles', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce modèle ?")) {
      await messageTemplateActions.deleteAction(id);
      loadTemplates();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modèles de Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos modèles d'emails et de SMS.
          </p>
        </div>
        <Link href="/templates/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          + Nouveau Modèle
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sujet</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.type === 'email' ? <Mail className="w-5 h-5 text-indigo-500" /> : <MessageSquare className="w-5 h-5 text-green-500" />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-xs">{template.subject || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Link href={`/templates/${template.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                        Modifier
                      </Link>
                      <button onClick={() => handleDelete(template.id)} className="text-red-600 hover:text-red-900">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucun modèle trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
