import Link from 'next/link';
import { Calendar, CheckSquare, FileText, Settings, MapPin, Briefcase, AlertCircle, Clock } from 'lucide-react';
import { WorkspaceConfig } from '@/lib/workspaces/types';
import { PracticeDashboardData } from '@/lib/services/practice-dashboard.service';
import { Organization } from '@/lib/data/interfaces';

interface ParamedicalPracticeDashboardProps {
  workspace: WorkspaceConfig;
  organization: Organization;
  data: PracticeDashboardData;
}

export default function ParamedicalPracticeDashboard({
  workspace,
  organization,
  data,
}: ParamedicalPracticeDashboardProps) {
  const professionLabel = workspace.label || 'Espace Paramédical';
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Aucune échéance';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-100';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return 'Normale';
    }
  };

  const locationText = [organization.address, organization.postalCode, organization.city]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6" data-tour="dashboard-overview">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aujourd'hui</h1>
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Briefcase className="w-4 h-4" />
              {organization.name}
            </span>
            <span className="text-gray-300">&bull;</span>
            <span className="capitalize">{professionLabel}</span>
          </div>
        </div>
        
        {locationText ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
            <MapPin className="w-4 h-4 text-gray-400" />
            {locationText}
          </div>
        ) : (
          <Link 
            href="/parametres/organisation"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            Configurer mon organisation
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" data-tour="dashboard-activities">
        {/* Main Content Area (Tasks) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                À traiter
                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {data.openTaskCount} {data.openTaskCount > 1 ? 'tâches ouvertes' : 'tâche ouverte'}
                </span>
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {data.nextTasks.length > 0 ? (
                data.nextTasks.map((task) => (
                  <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Aucune tâche ouverte.</h3>
                  <p className="text-sm text-gray-500 mb-4">Vous êtes à jour dans vos tâches !</p>
                  <Link 
                    href="/agenda/taches"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md transition-colors"
                  >
                    Voir les tâches
                  </Link>
                </div>
              )}
            </div>
            
            {data.openTaskCount > data.nextTasks.length && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
                <Link 
                  href="/agenda/taches"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Voir les {data.openTaskCount - data.nextTasks.length} autres tâches
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Quick Links */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Accès rapides
            </h2>
            <nav className="space-y-2">
              <Link 
                href="/agenda"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
              >
                <div className="bg-gray-100 group-hover:bg-blue-100 p-2 rounded-md transition-colors">
                  <Calendar className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-medium">Agenda</span>
              </Link>
              
              <Link 
                href="/agenda/taches"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
              >
                <div className="bg-gray-100 group-hover:bg-blue-100 p-2 rounded-md transition-colors">
                  <CheckSquare className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-medium">Tâches</span>
              </Link>

              <Link 
                href="/facturation"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
              >
                <div className="bg-gray-100 group-hover:bg-blue-100 p-2 rounded-md transition-colors">
                  <FileText className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-medium">Facturation</span>
              </Link>

              <Link 
                href="/parametres/organisation"
                className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
              >
                <div className="bg-gray-100 group-hover:bg-blue-100 p-2 rounded-md transition-colors">
                  <Settings className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-medium">Organisation</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
