import { Users, FileText, Calendar, CreditCard, ChevronRight, Activity } from 'lucide-react';

export default function ProductPreview() {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col w-full">
      {/* Header simulate */}
      <div className="h-12 border-b border-gray-100 flex items-center px-4 justify-between bg-gray-50/50">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-white rounded-md border border-gray-200 shadow-sm">
          app.monservice.com/dashboard
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>
      
      {/* Body */}
      <div className="flex flex-1 p-4 gap-6 bg-gray-50/30">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-48 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium text-sm">
            <Activity className="w-4 h-4" /> Vue d'ensemble
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            <Users className="w-4 h-4" /> Clients
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            <FileText className="w-4 h-4" /> Devis
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            <CreditCard className="w-4 h-4" /> Factures
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            <Calendar className="w-4 h-4" /> Agenda
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
            <div className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg shadow-sm">
              Nouveau devis
            </div>
          </div>
          
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Chiffre d'affaires</div>
              <div className="text-2xl font-bold text-gray-900">4 250 €</div>
              <div className="text-xs text-emerald-600 mt-2 font-medium flex items-center">
                +12% ce mois
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Devis en attente</div>
              <div className="text-2xl font-bold text-gray-900">3</div>
              <div className="text-xs text-amber-600 mt-2 font-medium flex items-center">
                Action requise
              </div>
            </div>
            <div className="hidden md:block bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Nouveaux clients</div>
              <div className="text-2xl font-bold text-gray-900">12</div>
              <div className="text-xs text-gray-400 mt-2 font-medium flex items-center">
                Depuis 30 jours
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-900">Activité récente</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Facture F-2026-042 payée</div>
                    <div className="text-xs text-gray-500">SARL Exemple • 1 200 €</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Devis D-2026-089 envoyé</div>
                    <div className="text-xs text-gray-500">M. Dupont • En attente de validation</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Nouveau rendez-vous</div>
                    <div className="text-xs text-gray-500">Demain, 14:00 • Réunion de lancement</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative floating elements to give depth */}
      <div className="hidden lg:flex absolute -right-4 top-1/4 animate-bounce" style={{ animationDuration: '3s' }}>
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100 text-xs font-medium text-emerald-600 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Facture payée
        </div>
      </div>
    </div>
  );
}
