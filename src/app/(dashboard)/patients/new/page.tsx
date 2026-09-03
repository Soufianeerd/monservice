import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces';
import { notFound } from 'next/navigation';
import PatientForm from '@/components/patients/PatientForm';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

export default async function NewPatientPage() {
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/patients" className="hover:text-blue-600 transition-colors">
            Patients
          </Link>
          <span>/</span>
          <span>Nouveau dossier</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-blue-600" />
          Nouveau dossier patient
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Saisie de l'identité civile et des coordonnées administratives du patient
        </p>
      </div>

      <PatientForm />
    </div>
  );
}
