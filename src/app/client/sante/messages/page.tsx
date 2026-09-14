'use server';

import Link from 'next/link';
import { db } from '@/lib/db/server';
import { practicePractitioners } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientMessagingService } from '@/lib/services/patient-messaging.service';
import { MessageSquare, ChevronLeft, ShieldAlert } from 'lucide-react';
import PatientChatRoom from '@/components/patient-portal/PatientChatRoom';

export default async function PatientPortalMessagesPage() {
  const portalCtx = await requirePatientPortalAccess();

  // Fetch active practitioners in this cabinet
  const practitioners = await db
    .select({
      id: practicePractitioners.id,
      fullName: practicePractitioners.displayName,
    })
    .from(practicePractitioners)
    .where(
      and(
        eq(practicePractitioners.organizationId, portalCtx.organizationId),
        eq(practicePractitioners.isActive, true),
      ),
    );

  const initialMessages = await patientMessagingService.listPatientMessagesForPortal(
    portalCtx.userId,
    portalCtx.patientId,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <Link
          href="/client/sante"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Retour au suivi santé
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Messagerie Cabinet & Praticien</h1>
        <p className="text-sm text-slate-500">
          Échangez avec l’équipe de votre cabinet pour vos questions relatives aux soins ou à l'organisation de vos séances.
        </p>
      </div>

      {/* Emergency reminder banner */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Rappel médical important :</strong> Cette messagerie n'est pas un service d'urgences. En cas d'urgence médicale vitale, appelez immédiatement le 15 ou le 112.
        </span>
      </div>

      <PatientChatRoom
        patientId={portalCtx.patientId}
        practitioners={practitioners}
        initialMessages={initialMessages}
        currentUserId={portalCtx.userId}
      />
    </div>
  );
}
