'use client';
import * as organizationActions from '@/app/actions/organization.actions';
import { getByIdAction, updateAction } from '@/app/actions/organization.actions';

import { use } from 'react';
import { useEffect, useState } from 'react';
import { Organization } from '@/lib/data/interfaces';
import ProfessionalProfile from '@/components/public/ProfessionalProfile';
import ProfessionalServices from '@/components/public/ProfessionalServices';
import ProfessionalReviews from '@/components/public/ProfessionalReviews';

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve(null).then((org: any) => {
      setOrganization(org as any);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!organization || !organization.isPublished) return <div className="min-h-screen flex items-center justify-center">Ce profil n'existe pas ou n'est pas public.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProfessionalProfile organization={organization} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <ProfessionalServices services={organization.services} />
            <ProfessionalReviews />
          </div>
          
          <div className="md:col-span-1 space-y-6">
            {/* Empty space for future sidebar widgets like 'Hours', 'Badges' */}
          </div>
        </div>
      </div>
    </div>
  );
}
