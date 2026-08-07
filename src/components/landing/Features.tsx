import { Users, FileText, Calendar, CheckCircle2 } from 'lucide-react';

export default function Features() {
  return (
    <div id="features" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Feature 1 */}
        <div className="relative mb-32 lg:mb-40">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-10 lg:mb-0">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-4">
                Tous vos clients, enfin au même endroit.
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Centralisez vos contacts, informations et historique d'activité dans un espace unique. Plus de fichiers Excel dispersés ou de notes perdues.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span>Fiches clients détaillées et centralisées</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span>Historique complet des échanges</span>
                </li>
              </ul>
            </div>
            
            <div className="relative rounded-2xl bg-gray-50 border border-gray-100 shadow-xl p-4 sm:p-6 lg:p-8">
              {/* Mockup UI Clients */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="font-semibold text-gray-900">Annuaire clients</div>
                  <div className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-600">Rechercher...</div>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">J</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Jean Dupont</div>
                        <div className="text-xs text-gray-500">jean.dupont@email.com</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Client depuis 2024</div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">S</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">SARL Exemple</div>
                        <div className="text-xs text-gray-500">contact@exemple.fr</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Client depuis 2023</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="relative mb-32 lg:mb-40">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-10 lg:mb-0 lg:order-2">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-4">
                Du devis à la facture, sans ressaisie.
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Créez vos documents commerciaux, suivez leur statut et gérez votre facturation depuis le même espace, en quelques clics.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span>Transformation d'un devis en facture en un clic</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span>Suivi des paiements et retards</span>
                </li>
              </ul>
            </div>
            
            <div className="relative rounded-2xl bg-gray-50 border border-gray-100 shadow-xl p-4 sm:p-6 lg:p-8 lg:order-1">
              {/* Mockup UI Devis */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="font-semibold text-gray-900">Devis récents</div>
                  <div className="px-2 py-1 bg-primary-600 text-white text-xs rounded shadow-sm">+ Nouveau</div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-sm font-medium">Devis #D-2026-042</div>
                    <div className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">En attente</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-4">Client: SARL Exemple • 1 450,00 €</div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Facture #F-2026-089</div>
                    <div className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Payée</div>
                  </div>
                  <div className="text-xs text-gray-500">Client: Jean Dupont • 450,00 €</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="mb-10 lg:mb-0">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-4">
                Gardez votre activité sous contrôle.
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Organisez vos rendez-vous, tâches et échéances sans multiplier les outils. Votre planning est directement relié à vos clients.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span>Agenda synchronisé avec votre activité</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                  <span>Gestion des tâches et relances</span>
                </li>
              </ul>
            </div>
            
            <div className="relative rounded-2xl bg-gray-50 border border-gray-100 shadow-xl p-4 sm:p-6 lg:p-8">
              {/* Mockup UI Agenda */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="font-semibold text-gray-900">Aujourd'hui</div>
                  <div className="text-xs text-gray-500">Jeu. 14 Mai</div>
                </div>
                <div className="divide-y divide-gray-100 relative">
                  {/* Ligne rouge "actuelle" */}
                  <div className="absolute top-1/2 left-0 w-full border-t border-red-300 z-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 left-2" />
                  </div>
                  
                  <div className="flex p-3 relative z-10">
                    <div className="w-16 text-xs text-gray-500 pt-1">09:00</div>
                    <div className="flex-1 bg-blue-50 border border-blue-100 rounded p-2 border-l-4 border-l-blue-500">
                      <div className="text-xs font-semibold text-blue-900">Rendez-vous chantier</div>
                      <div className="text-[10px] text-blue-700">SARL Exemple</div>
                    </div>
                  </div>
                  <div className="flex p-3 relative z-10">
                    <div className="w-16 text-xs text-gray-500 pt-1">11:30</div>
                    <div className="flex-1 bg-amber-50 border border-amber-100 rounded p-2 border-l-4 border-l-amber-500">
                      <div className="text-xs font-semibold text-amber-900">Relance devis</div>
                      <div className="text-[10px] text-amber-700">Jean Dupont</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
