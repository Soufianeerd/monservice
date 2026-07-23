'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus, CheckCircle, Clock, Circle } from 'lucide-react';
import { taskRepository, userRepository } from '@/lib/data';
import { Task, User } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import KanbanBoard from '@/components/crm/KanbanBoard';

type TaskWithUser = Task & { assignedUserName: string };

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('kanban');

  const loadData = async () => {
    if (!user?.organizationId) return;
    try {
      await Promise.resolve();
      setLoading(true);
      const [tasksData, usersData] = await Promise.all([
        taskRepository.findByOrganization(user.organizationId),
        userRepository.getAll() // Note: filter by org in real app, here we just use all as users are few
      ]);

      const userMap = new Map(usersData.map(u => [u.id, u.name]));

      const enriched = tasksData.map(t => ({
        ...t,
        assignedUserName: t.assignedTo ? (userMap.get(t.assignedTo) || 'Inconnu') : 'Non assigné'
      }));

      setTasks(enriched);
      // Filter users by org
      setUsers(usersData.filter(u => u.organizationId === user.organizationId));
    } catch (error) {
      console.error('Erreur', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.organizationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) return;
    await taskRepository.delete(id);
    loadData();
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await taskRepository.update(taskId, { status: newStatus });
    loadData();
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === '' || t.status === selectedStatus;
    const matchesPriority = selectedPriority === '' || t.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Terminé': return <CheckCircle className="h-4 w-4 text-green-500 mr-2" />;
      case 'En cours': return <Clock className="h-4 w-4 text-blue-500 mr-2" />;
      default: return <Circle className="h-4 w-4 text-gray-400 mr-2" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Haute': return 'bg-red-100 text-red-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Basse': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tâches</h1>
          <p className="mt-2 text-sm text-gray-500">Suivez vos actions et rappels.</p>
        </div>
        <Link href="/tasks/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle tâche
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
        <input 
          type="text" 
          placeholder="Rechercher une tâche..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Tous les statuts</option>
          <option value="À faire">À faire</option>
          <option value="En cours">En cours</option>
          <option value="Terminé">Terminé</option>
        </select>
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-4 py-2 border border-gray-300 bg-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Toutes priorités</option>
          <option value="Haute">Haute</option>
          <option value="Moyenne">Moyenne</option>
          <option value="Basse">Basse</option>
        </select>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${view === 'list' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            Vue Liste
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${view === 'kanban' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            Kanban
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Aucune tâche trouvée.</div>
      ) : view === 'kanban' ? (
        <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} />
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigné à</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Échéance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {getStatusIcon(task.status)}
                      {task.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.assignedUserName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.dueDate ? new Intl.DateTimeFormat('fr-FR').format(new Date(task.dueDate)) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link href={`/tasks/${task.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/tasks/${task.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:text-red-900 inline-flex">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
