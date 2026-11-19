import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';
import { toErrorResponse } from '@/lib/utils/api-response';

// S-13 : une requête GET ne modifie plus rien. Elle liste les documents dont la
// durée de conservation légale est échue ; l'anonymisation automatique n'est pas
// livrée en V1 (l'ancienne version notait « anonymisé » sans rien anonymiser).
export async function GET() {
  try {
    const session = await requireProfessional();
    const expired = await retentionService.getExpiredDocuments(session.organizationId);

    return NextResponse.json({
      expired,
      message: expired.length === 0
        ? 'Aucun document n’a dépassé sa durée de conservation.'
        : `${expired.length} document(s) ont dépassé leur durée de conservation.`,
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la vérification de la rétention');
  }
}
