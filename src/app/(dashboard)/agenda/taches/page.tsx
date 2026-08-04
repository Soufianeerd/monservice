'use client';

import * as taskActions from '@/app/actions/task.actions';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Plus, CheckCircle, Clock, Circle } from 'lucide-react';

import * as userActions from '@/app/actions/user.actions';
import { Task, User } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import KanbanBoard from '@/components/crm/KanbanBoard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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

  const fetchData = async () => {
    if (!user?.organizationId) return null;
    const [tasksData, usersData] = await Promise.all([
      taskActions.findByOrganizationAction(user.organizationId),
      userActions.getAllUsersAction()
    ]);

    const userMap = new Map(usersData.map(u => [u.id, u.name]));

    const enriched = tasksData.map(t => ({
      ...t,
      assignedUserName: t.assignedTo ? (userMap.get(t.assignedTo) || 'Inconnu') : 'Non assigné'
    }));

    return {
      tasks: enriched,
      users: usersData.filter(u => u.organizationId === user.organizationId)
    };
  };

  const loadData = async () => {
    try {
      const data = await fetchData();
      if (data) {
        setTasks(data.tasks);
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Erreur', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        const data = await fetchData();
        if (!ignore && data) {
          setTasks(data.tasks);
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      ignore = true;
    };
  }, [user?.organizationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?") || !user?.organizationId) return;
    await taskActions.deleteAction(id, user.organizationId);
    loadData();
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    if (!user?.organizationId) return;
    await taskActions.updateAction(taskId, user.organizationId, { status: newStatus });
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

  const getPriorityVariant = (priority: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch(priority) {
      case 'Haute': return 'error';
      case 'Moyenne': return 'warning';
      case 'Basse': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link href="/agenda/taches/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle tâche
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
        <div className="flex-1 max-w-md">
          <Input 
            type="text" 
            placeholder="Rechercher une tâche..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            label="Recherche"
            hideLabel
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            label="Filtrer par statut"
            hideLabel
          >
            <option value="">Tous les statuts</option>
            <option value="À faire">À faire</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            label="Filtrer par priorité"
            hideLabel
          >
            <option value="">Toutes priorités</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </Select>
        </div>
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
        <div className="space-y-4">
          {/* Vue mobile: Cartes */}
          <div className="sm:hidden space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <span className="font-bold text-gray-900">{task.title}</span>
                  <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center text-gray-700">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </div>
                  <div>Assigné à: {task.assignedUserName}</div>
                  {task.dueDate && <div>Échéance: {new Intl.DateTimeFormat('fr-FR').format(new Date(task.dueDate))}</div>}
                </CardBody>
                <CardFooter>
                  <Link href={`/agenda/taches/${task.id}`} className="text-indigo-600 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${task.title}`}>
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link href={`/agenda/taches/${task.id}/edit`} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${task.title}`}>
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${task.title}`}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Vue desktop: Tableau */}
          <div className="hidden sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Titre</TableHeader>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader>Priorité</TableHeader>
                  <TableHeader>Assigné à</TableHeader>
                  <TableHeader>Échéance</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-gray-900">{task.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(task.status)}
                        {task.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                    </TableCell>
                    <TableCell>{task.assignedUserName}</TableCell>
                    <TableCell>
                      {task.dueDate ? new Intl.DateTimeFormat('fr-FR').format(new Date(task.dueDate)) : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-3">
                      <Link href={`/agenda/taches/${task.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir ${task.title}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/agenda/taches/${task.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${task.title}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:text-red-900 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${task.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
