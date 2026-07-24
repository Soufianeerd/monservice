import React from 'react';
import Link from 'next/link';
import { Task } from '@/lib/data/interfaces';
import { Clock, CheckCircle, Circle, Edit, Eye } from 'lucide-react';

interface KanbanBoardProps {
  tasks: (Task & { assignedUserName: string })[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

export default function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const columns: { title: Task['status'], id: Task['status'] }[] = [
    { title: 'À faire', id: 'À faire' },
    { title: 'En cours', id: 'En cours' },
    { title: 'En attente', id: 'En attente' },
    { title: 'Terminé', id: 'Terminé' },
  ];

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Haute': return 'bg-red-100 text-red-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Basse': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Terminé': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'En cours': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Simulating drag and drop with simple buttons for now (full drag and drop requires dnd-kit or react-beautiful-dnd)
  return (
    <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 snap-x">
      {columns.map(col => {
        const columnTasks = tasks.filter(t => t.status === col.id);
        return (
          <div key={col.id} className="min-w-[300px] w-80 sm:w-72 bg-gray-50 rounded-lg p-4 flex-shrink-0 flex flex-col max-h-[70vh] snap-center">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                {getStatusIcon(col.id)}
                {col.title}
              </h2>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {columnTasks.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <div className="flex space-x-2">
                      <Link href={`/tasks/${task.id}`} className="text-gray-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Voir la tâche ${task.title}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/tasks/${task.id}/edit`} className="text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier la tâche ${task.title}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1 leading-tight">{task.title}</h3>
                  
                  {task.dueDate && (
                    <div className="text-xs text-gray-500 mb-2">
                      Échéance: {new Intl.DateTimeFormat('fr-FR').format(new Date(task.dueDate))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" title={task.assignedUserName}>
                        {task.assignedUserName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Action rapide : Déplacer vers l'étape suivante */}
                    <div className="flex gap-1">
                      {columns.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => onStatusChange(task.id, c.id)}
                          className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          title={`Déplacer vers ${c.title}`}
                          aria-label={`Déplacer vers ${c.title}`}
                        >
                          {c.title.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-md text-gray-400 text-sm">
                  Aucune tâche
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
