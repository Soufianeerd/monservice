'use client';

import * as taskActions from '@/app/actions/task.actions';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Edit, ArrowLeft, Trash2 } from 'lucide-react';

import * as userActions from '@/app/actions/user.actions';
import { Task, User } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!currentUser?.organizationId) return;
      const t = await taskActions.findByIdAction(params.id as string, currentUser.organizationId);
      if (t && t.organizationId === currentUser.organizationId) {
        setTask(t);
        if (t.assignedTo) {
          const u = await userActions.getUserProfileAction(t.assignedTo);
          setAssignedUser(u);
        }
      } else {
        router.push('/tasks');
      }
      setLoading(false);
    }
    load();
  }, [params.id, currentUser, router]);

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?") || !currentUser?.organizationId) return;
    await taskActions.deleteAction(params.id as string, currentUser.organizationId);
    router.push('/tasks');
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!task) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDelete} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </button>
          <Link href={`/tasks/${task.id}/edit`} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Détails de la tâche</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Titre</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{task.title}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">{task.description || '-'}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Statut</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{task.status}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Priorité</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{task.priority}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Assigné à</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{assignedUser?.name || 'Non assigné'}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date d&apos;échéance</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {task.dueDate ? new Intl.DateTimeFormat('fr-FR').format(new Date(task.dueDate)) : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
