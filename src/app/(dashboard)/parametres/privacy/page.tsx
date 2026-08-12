import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, FileText, CheckSquare, Users, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Confidentialité et RGPD - Paramètres',
};

export default function PrivacySettingsPage() {
  const cards = [
    {
      title: 'Registre des traitements',
      description: 'Gérez vos activités de traitement de données (Article 30 du RGPD).',
      href: '/parametres/privacy/register',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Consentements',
      description: 'Suivez et gérez les préférences de vos clients.',
      href: '/parametres/privacy/consents',
      icon: CheckSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Demandes des personnes (DSAR)',
      description: 'Traitez les demandes d\'accès, rectification et effacement.',
      href: '/parametres/privacy/dsar',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Violations de données',
      description: 'Enregistrez et notifiez les incidents de sécurité.',
      href: '/parametres/privacy/breach',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-indigo-600" />
          Conformité RGPD
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez vos obligations légales en matière de protection des données personnelles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-100 h-full flex flex-col">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <h2 className="ml-4 text-lg font-semibold text-gray-900">{card.title}</h2>
              </div>
              <p className="text-gray-600 text-sm flex-grow">{card.description}</p>
              <div className="mt-4 text-sm font-medium text-indigo-600 flex items-center">
                Gérer
                <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
