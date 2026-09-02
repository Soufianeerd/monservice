import { getPracticeStructureAction } from '@/app/actions/practice-structure.actions';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { notFound } from 'next/navigation';
import { PracticeStructureManager } from '@/components/practice/PracticeStructureManager';

export const metadata = {
  title: 'Paramètres Cabinet | MonService',
};

export default async function CabinetPage() {
  const context = await requireProfessional();
  if (!context.organizationId) {
    notFound();
  }

  const organization = await organizationService.getById(context.organizationId);
  if (!organization) {
    notFound();
  }

  const workspace = resolveWorkspace({
    sector: organization.sector,
    profession: organization.profession,
    country: organization.country,
  });

  if (workspace.type !== 'paramedical') {
    notFound();
  }

  const overview = await getPracticeStructureAction();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Structure du Cabinet
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Gérez les lieux de consultation, les salles, les praticiens et les équipements.
            </p>
          </div>
          
          <div className="mt-5">
            <PracticeStructureManager overview={overview} />
          </div>
        </div>
      </div>
    </div>
  );
}

