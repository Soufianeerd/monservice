import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function GET() {
  try {
    const session = await requireProfessional();

    const expired = await retentionService.getExpiredDocuments(session.organizationId);

    let processed = 0;
    for (const doc of expired) {
      await retentionService.anonymizeDocument(doc.id, doc.type as 'invoice' | 'quote');
      processed++;
    }

    return NextResponse.json({ 
      expired, 
      processed,
      message: `${processed} documents automatically anonymized.` 
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la vérification de la rétention');
  }
}
