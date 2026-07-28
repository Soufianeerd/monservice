import { Organization } from '@/lib/data/interfaces';
import { Card, CardBody } from '@/components/ui/Card';
import { MapPinIcon, GlobeIcon, MailIcon, PhoneIcon } from 'lucide-react';

export default function ProfessionalProfile({ organization }: { organization: Organization }) {
  return (
    <Card>
      <div 
        className="h-32 w-full bg-indigo-600 rounded-t-lg bg-cover bg-center"
        style={{ backgroundImage: organization.coverImage ? `url(${organization.coverImage})` : undefined }}
      />
      <CardBody className="relative pt-12">
        <div className="absolute -top-12 left-6">
          <div className="h-24 w-24 rounded-full border-4 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm">
            {organization.logo ? (
              <img src={organization.logo} alt={organization.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-300">{organization.name.charAt(0)}</span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-gray-500 font-medium">{organization.industry} {organization.sector ? `• ${organization.sector}` : ''}</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              Contacter
            </button>
            <button className="bg-indigo-600 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700">
              Demander un devis
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900">À propos</h3>
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
            {organization.description || "Aucune description fournie."}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-6">
          {organization.city && (
            <div className="flex items-center text-sm text-gray-500">
              <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
              {organization.city}, {organization.country}
              {organization.interventionRadius ? ` (Rayon : ${organization.interventionRadius} km)` : ''}
            </div>
          )}
          {organization.website && (
            <div className="flex items-center text-sm text-gray-500">
              <GlobeIcon className="h-5 w-5 mr-2 text-gray-400" />
              <a href={organization.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
                Site internet
              </a>
            </div>
          )}
          {organization.email && (
            <div className="flex items-center text-sm text-gray-500">
              <MailIcon className="h-5 w-5 mr-2 text-gray-400" />
              <a href={`mailto:${organization.email}`} className="hover:text-indigo-600">
                {organization.email}
              </a>
            </div>
          )}
          {organization.phone && (
            <div className="flex items-center text-sm text-gray-500">
              <PhoneIcon className="h-5 w-5 mr-2 text-gray-400" />
              <a href={`tel:${organization.phone}`} className="hover:text-indigo-600">
                {organization.phone}
              </a>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
